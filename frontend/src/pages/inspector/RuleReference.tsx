import React, { useState } from 'react';
import { BookOpen, Search, Filter, ShieldCheck, Scale } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { BookOpen, Search, Filter, ShieldCheck, Scale, ExternalLink, RefreshCw, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { RuleItem, fetchRules } from '../../services/ruleService';

export const RuleReference: React.FC = () => {
  const [search, setSearch] = useState('');
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [selectedFamily, setSelectedFamily] = useState<string>('ALL');

  const rules = [
    {
      ref: 'Rule 6(1)(a)',
      title: 'Common or Generic Name of the Commodity',
      desc: 'The name or names of the commodity contained in the package, or in the case of a package containing more than one product, the name and number or quantity of each product shall be mentioned on the principal display panel.',
      applicability: 'All Retail Packages',
      status: 'Active',
      source: 'Legal Metrology (Packaged Commodities) Rules, 2011',
    },
    {
      ref: 'Rule 6(1)(b)',
      title: 'Name and Address of the Manufacturer / Packer / Importer',
      desc: 'The name and complete address of the manufacturer, or where the manufacturer is not the packer, the name and address of the manufacturer and packer, and in case of imported packages, the name and address of the importer.',
      applicability: 'Mandatory across Retail, Wholesale & Imported',
      status: 'Active',
      source: 'LMPC Rules 2011, Section 6(1)(b)',
    },
    {
      ref: 'Rule 6(1)(d)',
      title: 'Net Quantity in Standard Units of Weight or Measure',
      desc: 'The net quantity, in terms of the standard unit of weight or measure, of the commodity contained in the package shall be declared. Numeral font height must comply with prescribed minimums in Table 1.',
      applicability: 'All Packages',
      status: 'Active',
      source: 'LMPC Rules 2011, First Schedule Table 1',
    },
    {
      ref: 'Rule 6(1)(e)',
      title: 'Maximum Retail Price (MRP) Declaration',
      desc: 'The retail sale price of the package inclusive of all taxes, declared in the prescribed manner with the words "Maximum or Max. Retail Price inclusive of all taxes" or "MRP Rs. ... incl. of all taxes".',
      applicability: 'All Retail Packages (Industrial/Institutional packages exempt)',
      status: 'Active',
      source: 'LMPC Rules 2011, Section 6(1)(e)',
    },
    {
      ref: 'Rule 6(1)(f)',
      title: 'Month and Year of Manufacture / Packing / Import',
      desc: 'The month and year in which the commodity is manufactured or pre-packed or imported shall be mentioned conspicuously.',
      applicability: 'Mandatory (Best before/expiry required for perishable items)',
      status: 'Active',
      source: 'LMPC Rules 2011, Section 6(1)(f)',
    },
    {
      ref: 'Rule 6(1)(g)',
      title: 'Consumer Care Contact Information',
      desc: 'The name, address, telephone number and e-mail address of the person or officer who can be contacted by the consumer in case of complaints.',
      applicability: 'All Retail Packages',
      status: 'Active',
      source: 'LMPC Rules 2011, Section 6(1)(g)',
    },
    {
      ref: 'Rule 6(1)(n)',
      title: 'Country of Origin (For Imported Goods)',
      desc: 'The name of the country of origin or manufacture shall be mentioned on the package where the package contains imported commodities.',
      applicability: 'Imported Packages strictly',
      status: 'Active',
      source: 'LMPC Amendment Rules, 2017 & 2021',
    },
  ];
  useEffect(() => {
    async function loadRules() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchRules();
        setRules(data);
      } catch (err: unknown) {
        console.error('Failed to fetch rule references:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch rules');
      } finally {
        setLoading(false);
      }
    }
    loadRules();
  }, []);

  const filteredRules = rules.filter(
    (r) =>
      r.ref.toLowerCase().includes(search.toLowerCase()) ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.desc.toLowerCase().includes(search.toLowerCase())
  );
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
        title="LMPC Rule Reference Directory"
        subtitle="Official Legal Metrology (Packaged Commodities) statutory provisions and applicability conditions"
        title="LMPC Statutory Rule Reference Directory"
        subtitle="Official Legal Metrology (Packaged Commodities) statutory provisions, applicable schedules, and gazette amendments"
        badge={<Badge variant="purple">Authoritative v1.0</Badge>}
        breadcrumbs={[
          { label: 'Dashboard', href: '/inspector/dashboard' },
          { label: 'Rule Reference' },
        ]}
      />

      <div className="flex items-center space-x-3">
        <div className="relative flex-1 max-w-md">
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
        <span className="text-xs text-slate-500 font-medium">
          Showing {filteredRules.length} LMPC rule records
        </span>

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRules.map((rule) => (
          <Card key={rule.ref}>
            <CardHeader
              title={
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    {rule.ref}
                  </span>
                  <span className="text-sm font-bold text-slate-900">{rule.title}</span>
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
              }
              action={<Badge variant="success">{rule.status}</Badge>}
            />
            <CardContent className="space-y-3 text-xs">
              <p className="text-slate-600 leading-relaxed">{rule.desc}</p>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 space-y-1 text-[11px]">
                <div>
                  <span className="font-bold text-slate-500">Applicability:</span>{' '}
                  <span className="text-slate-800">{rule.applicability}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500">Official Source:</span>{' '}
                  <span className="text-slate-500 italic">{rule.source}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

