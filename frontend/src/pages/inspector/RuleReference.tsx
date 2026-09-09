import React, { useState } from 'react';
import { BookOpen, Search, Filter, ShieldCheck, Scale } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

export const RuleReference: React.FC = () => {
  const [search, setSearch] = useState('');

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

  const filteredRules = rules.filter(
    (r) =>
      r.ref.toLowerCase().includes(search.toLowerCase()) ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.desc.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="LMPC Rule Reference Directory"
        subtitle="Official Legal Metrology (Packaged Commodities) statutory provisions and applicability conditions"
        breadcrumbs={[
          { label: 'Dashboard', href: '/inspector/dashboard' },
          { label: 'Rule Reference' },
        ]}
      />

      <div className="flex items-center space-x-3">
        <div className="relative flex-1 max-w-md">
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
    </div>
  );
};

