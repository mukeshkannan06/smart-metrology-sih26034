import React, { useState } from 'react';
import { Package, Search, Plus, Tag, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Table, Column } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

interface CommodityProfile {
  id: string;
  name: string;
  category: string;
  mandatoryRules: string;
  riskLevel: 'high' | 'medium' | 'standard';
  inspectionsCount: number;
}

export const ProductsCommodities: React.FC = () => {
  const [search, setSearch] = useState('');

  const commodities: CommodityProfile[] = [
    {
      id: 'CMD-001',
      name: 'Edible Oils & Vanaspati',
      category: 'Food Products',
      mandatoryRules: 'Rule 6(1)(a-g), Net Vol/Weight, USP',
      riskLevel: 'high',
      inspectionsCount: 18,
    },
    {
      id: 'CMD-002',
      name: 'Ghee & Dairy Products',
      category: 'Dairy',
      mandatoryRules: 'Rule 6(1)(a-g), Best Before, Veg Symbol',
      riskLevel: 'medium',
      inspectionsCount: 14,
    },
    {
      id: 'CMD-003',
      name: 'Biscuits & Confectionery',
      category: 'Packaged Food',
      mandatoryRules: 'Rule 6(1)(a-g), Net Qty Numeral Height',
      riskLevel: 'medium',
      inspectionsCount: 12,
    },
    {
      id: 'CMD-004',
      name: 'Soaps & Detergents',
      category: 'Non-Food Retail',
      mandatoryRules: 'Rule 6(1)(a-g), Batch/Lot, Net Weight',
      riskLevel: 'standard',
      inspectionsCount: 10,
    },
    {
      id: 'CMD-005',
      name: 'Imported Dry Fruits & Nuts',
      category: 'Imported Goods',
      mandatoryRules: 'Rule 6(1)(a-g), Country of Origin, Importer',
      riskLevel: 'high',
      inspectionsCount: 8,
    },
  ];

  const columns: Column<CommodityProfile>[] = [
    {
      header: 'Code',
      accessor: 'id',
      render: (row) => <span className="font-mono font-bold text-slate-700">{row.id}</span>,
    },
    {
      header: 'Commodity Name',
      render: (row) => (
        <div>
          <div className="font-bold text-slate-800">{row.name}</div>
          <div className="text-[11px] text-slate-400">{row.category}</div>
        </div>
      ),
    },
    {
      header: 'Applicable LMPC Rules Profile',
      accessor: 'mandatoryRules',
      render: (row) => <span className="text-xs text-blue-800 font-mono">{row.mandatoryRules}</span>,
    },
    {
      header: 'Risk Level',
      render: (row) => (
        <Badge variant={row.riskLevel === 'high' ? 'danger' : row.riskLevel === 'medium' ? 'warning' : 'neutral'}>
          {row.riskLevel.toUpperCase()}
        </Badge>
      ),
    },
    {
      header: 'Inspections Completed',
      accessor: 'inspectionsCount',
      render: (row) => <span className="font-bold text-slate-800">{row.inspectionsCount}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Commodities & Products Directory"
        subtitle="Supervisory catalog of packaged commodity profiles, risk classifications, and statutory declaration mappings"
        breadcrumbs={[
          { label: 'Supervisory Dashboard', href: '/controller/dashboard' },
          { label: 'Products / Commodities' },
        ]}
        actions={
          <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}>
            Add Commodity Profile
          </Button>
        }
      />

      <Card>
        <CardHeader
          title="Regulated Commodity Categories"
          subtitle="Showing 5 commodities actively examined in enforcement inspections"
        />
        <CardContent className="p-0">
          <Table columns={columns} data={commodities} keyExtractor={(row) => row.id} />
        </CardContent>
      </Card>
    </div>
  );
};

