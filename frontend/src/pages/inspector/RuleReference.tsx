import React, { useState, useEffect } from 'react';
import {
  Search,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { RuleItem, fetchRules } from '../../services/ruleService';

export const RuleReference: React.FC = () => {
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [selectedFamily, setSelectedFamily] = useState<string>('ALL');

  const loadRules = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchRules();
      setRules(data);
    } catch (err: unknown) {
      console.error('Failed to load rules:', err);
      setError(err instanceof Error ? err.message : 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const filteredRules = rules.filter((r) => {
    const matchesSearch =
      search === '' ||
      r.rule_id.toLowerCase().includes(search.toLowerCase()) ||
      r.rule_reference.toLowerCase().includes(search.toLowerCase()) ||
      r.requirement_description.toLowerCase().includes(search.toLowerCase()) ||
      r.declaration_type.toLowerCase().includes(search.toLowerCase()) ||
      r.source_section.toLowerCase().includes(search.toLowerCase());

    const matchesFamily =
      selectedFamily === 'ALL' || r.rule_family === selectedFamily;

    return matchesSearch && matchesFamily;
  });

  const families = Array.from(new Set(rules.map((r) => r.rule_family))).filter(Boolean);

  return (
    <div className="space-y-6">
      <PageHeader
        title="LMPC Statutory Rule Reference Directory"
        subtitle="Official Legal Metrology (Packaged Commodities) statutory provisions, applicable schedules, and gazette amendments"
        badge={<Badge variant="purple">Authoritative v1.0</Badge>}
        breadcrumbs={[
          { label: 'Dashboard', href: '/inspector/dashboard' },
          { label: 'Rule Reference' },
        ]}
      />

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rules, declarations, or section numbers..."
            className="w-full text-xs px-3 py-2 pl-9 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedFamily}
            onChange={(e) => setSelectedFamily(e.target.value)}
            className="text-xs px-2.5 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Rule Families</option>
            {families.map((fam) => (
              <option key={fam} value={fam}>
                {fam}
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-500 font-medium">
            Showing {filteredRules.length} statutory records
          </span>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
          <RefreshCw className="w-5 h-5 text-blue-600 animate-spin mx-auto mb-2" />
          Loading official LMPC rule database...
        </div>
      ) : error ? (
        <div className="p-8 text-center text-xs text-red-600 bg-red-50 rounded-xl border border-red-200">
          <AlertTriangle className="w-5 h-5 mx-auto mb-2" />
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRules.map((rule) => (
            <Card key={rule.rule_id}>
              <CardHeader
                title={
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      {rule.rule_reference}
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {rule.declaration_type.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                }
                action={
                  <Badge
                    variant={
                      rule.rule_status === 'ACTIVE'
                        ? 'success'
                        : rule.rule_status === 'REVIEW_REQUIRED'
                        ? 'warning'
                        : 'neutral'
                    }
                  >
                    {rule.rule_status}
                  </Badge>
                }
              />
              <CardContent className="space-y-3 text-xs">
                <p className="text-slate-700 leading-relaxed font-medium">
                  {rule.requirement_description}
                </p>

                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5 text-[11px]">
                  <div>
                    <span className="font-bold text-slate-500">Package Scope:</span>{' '}
                    <span className="font-mono text-slate-800 bg-slate-200/60 px-1 py-0.5 rounded">
                      {rule.package_context}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500">Mandate:</span>{' '}
                    <span className="text-slate-800 font-semibold">{rule.mandatory_status}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500">Official Citation:</span>{' '}
                    <span className="text-slate-600 italic">
                      {rule.source_section} &bull; {rule.source_document}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500">Applicability Principle:</span>{' '}
                    <span className="text-slate-700">{rule.human_condition_text}</span>
                  </div>
                  {rule.source_url && (
                    <div className="pt-1">
                      <a
                        href={rule.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline inline-flex items-center gap-1 font-semibold"
                      >
                        Official Gazette Link <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
