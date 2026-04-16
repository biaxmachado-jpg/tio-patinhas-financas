"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { X, Plus, Eye, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: string;
  [key: string]: any;
}

interface TransformationRule {
  id: string;
  pattern: string;
  replacement: string;
  isRegex: boolean;
  enabled: boolean;
}

interface DescriptionBatchEditorProps {
  transactions: Transaction[];
  onApplyTransformations: (updatedTransactions: Transaction[]) => void;
  onCancel: () => void;
}

// Common normalization patterns
const PRESET_PATTERNS = [
  {
    name: "Remover números de autorização",
    pattern: "\\s*[A-Z]{2}\\d{6,}",
    replacement: "",
    isRegex: true,
  },
  {
    name: "Remover datas duplicadas",
    pattern: "\\d{2}/\\d{2}/\\d{4}\\s*-\\s*",
    replacement: "",
    isRegex: true,
  },
  {
    name: "Remover espaços extras",
    pattern: "\\s{2,}",
    replacement: " ",
    isRegex: true,
  },
  {
    name: "Converter para maiúsculas",
    pattern: "^(.+)$",
    replacement: "$1",
    isRegex: true,
    uppercase: true,
  },
  {
    name: "Remover 'PAGTO' ou 'DÉBITO'",
    pattern: "(PAGTO|DÉBITO|DEBITO)\\s*",
    replacement: "",
    isRegex: true,
  },
];

export function DescriptionBatchEditor({
  transactions,
  onApplyTransformations,
  onCancel,
}: DescriptionBatchEditorProps) {
  const [rules, setRules] = useState<TransformationRule[]>([]);
  const [preview, setPreview] = useState<Transaction[]>(transactions);
  const [showPreview, setShowPreview] = useState(false);
  const [newPattern, setNewPattern] = useState("");
  const [newReplacement, setNewReplacement] = useState("");
  const [isRegex, setIsRegex] = useState(true);

  const applyRules = (txs: Transaction[]) => {
    let result = JSON.parse(JSON.stringify(txs));

    for (const rule of rules) {
      if (!rule.enabled) continue;

      result = result.map((tx: Transaction) => {
        try {
          let newDescription = tx.description;

          if (rule.isRegex) {
            const regex = new RegExp(rule.pattern, "g");
            newDescription = newDescription.replace(regex, rule.replacement);
          } else {
            newDescription = newDescription.split(rule.pattern).join(rule.replacement);
          }

          // Trim whitespace
          newDescription = newDescription.trim();

          return {
            ...tx,
            description: newDescription,
          };
        } catch (error) {
          console.error("Error applying rule:", error);
          return tx;
        }
      });
    }

    return result;
  };

  const handleAddRule = () => {
    if (!newPattern) {
      toast.error("Por favor, insira um padrão");
      return;
    }

    try {
      if (isRegex) {
        new RegExp(newPattern);
      }
    } catch (error) {
      toast.error("Padrão regex inválido");
      return;
    }

    const newRule: TransformationRule = {
      id: Date.now().toString(),
      pattern: newPattern,
      replacement: newReplacement,
      isRegex,
      enabled: true,
    };

    const updatedRules = [...rules, newRule];
    setRules(updatedRules);
    setNewPattern("");
    setNewReplacement("");
    setShowPreview(true);

    // Update preview
    const updated = applyRules(transactions.map(tx => ({ ...tx })));
    setPreview(updated);

    toast.success("Regra adicionada!");
  };

  const handleApplyPreset = (preset: (typeof PRESET_PATTERNS)[0]) => {
    const newRule: TransformationRule = {
      id: Date.now().toString(),
      pattern: preset.pattern,
      replacement: preset.replacement,
      isRegex: preset.isRegex,
      enabled: true,
    };

    const updatedRules = [...rules, newRule];
    setRules(updatedRules);
    setShowPreview(true);

    // Update preview
    const updated = applyRules(transactions.map(tx => ({ ...tx })));
    setPreview(updated);

    toast.success(`Padrão "${preset.name}" adicionado!`);
  };

  const handleToggleRule = (id: string) => {
    const updated = rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
    setRules(updated);

    // Update preview
    const newPreview = applyRules(transactions.map(tx => ({ ...tx })));
    setPreview(newPreview);
  };

  const handleRemoveRule = (id: string) => {
    const updated = rules.filter((r) => r.id !== id);
    setRules(updated);

    // Update preview
    const newPreview = applyRules(transactions.map(tx => ({ ...tx })));
    setPreview(newPreview);
  };

  const handleApply = () => {
    onApplyTransformations(preview);
    toast.success("Descrições normalizadas com sucesso!");
  };

  const changedCount = preview.filter(
    (tx, idx) => tx.description !== transactions[idx].description
  ).length;

  return (
    <Card className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Normalizar Descrições</h2>
          <p className="text-sm text-muted-foreground">
            {changedCount} de {transactions.length} transação(ões) será(ão) modificada(s)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleApply}
            disabled={changedCount === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            <Copy className="h-4 w-4 mr-2" />
            Aplicar Mudanças
          </Button>
        </div>
      </div>

      {/* Preset patterns */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <p className="text-sm font-medium text-blue-900 mb-3">Padrões pré-definidos:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {PRESET_PATTERNS.map((preset, idx) => (
            <Button
              key={idx}
              size="sm"
              variant="outline"
              onClick={() => handleApplyPreset(preset)}
              className="justify-start"
            >
              <Plus className="h-3 w-3 mr-2" />
              {preset.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Custom rule input */}
      <div className="border rounded-lg p-4 space-y-3">
        <p className="text-sm font-medium">Criar regra personalizada:</p>
        <div className="space-y-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Padrão</label>
            <Input
              placeholder={isRegex ? "Ex: \\d{6,}" : "Ex: PAGTO"}
              value={newPattern}
              onChange={(e) => setNewPattern(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Substituir por</label>
            <Input
              placeholder="Ex: [vazio para remover]"
              value={newReplacement}
              onChange={(e) => setNewReplacement(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isRegex"
              checked={isRegex}
              onChange={(e) => setIsRegex(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="isRegex" className="text-sm">
              Usar expressão regular (regex)
            </label>
          </div>
          <Button onClick={handleAddRule} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Regra
          </Button>
        </div>
      </div>

      {/* Applied rules */}
      {rules.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Regras aplicadas ({rules.length}):</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded border"
              >
                <div className="flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={() => handleToggleRule(rule.id)}
                    className="mr-2"
                  />
                  <span className="text-xs font-mono text-muted-foreground truncate">
                    {rule.isRegex ? "/" : '"'}
                    {rule.pattern}
                    {rule.isRegex ? "/" : '"'} → "{rule.replacement}"
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemoveRule(rule.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Pré-visualização:</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {showPreview ? "Ocultar" : "Mostrar"}
          </Button>
        </div>

        {showPreview && (
          <div className="bg-gray-50 p-3 rounded border max-h-64 overflow-y-auto space-y-2">
            {preview.slice(0, 10).map((tx, idx) => {
              const original = transactions[idx];
              const changed = tx.description !== original.description;

              return (
                <div key={tx.id} className={`text-xs p-2 rounded ${changed ? "bg-green-50 border border-green-200" : "bg-white"}`}>
                  <div className="font-mono">
                    <span className="text-muted-foreground">Antes:</span> {original.description}
                  </div>
                  {changed && (
                    <div className="font-mono text-green-700">
                      <span className="text-muted-foreground">Depois:</span> {tx.description}
                    </div>
                  )}
                </div>
              );
            })}
            {preview.length > 10 && (
              <p className="text-xs text-muted-foreground text-center">
                +{preview.length - 10} mais...
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
