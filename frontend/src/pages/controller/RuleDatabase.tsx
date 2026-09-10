import React, { useState, useEffect } from 'react';
import {
  Database,
  Search,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Clock,
  CheckCircle2,
  RefreshCw,
  Eye,
  X,
  ToggleLeft,
  ToggleRight,
  FileText,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Table, Column } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  RuleItem,
  RuleStatistics,
  fetchRules,
  fetchRuleStatistics,
  updateRuleStatus,
} from '../../services/ruleService';

export const RuleDatabase: React.FC = () => {
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [statistics, setStatistics] = useState<RuleStatistics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [familyFilter, setFamilyFilter] = useState<string>('ALL');
  const [selectedRule, setSelectedRule] = useState<RuleItem | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [rulesData, statsData] = await Promise.all([
        fetchRules(),
        fetchRuleStatistics(),
      ]);
      setRules(rulesData);
      setStatistics(statsData);
    } catch (err: unknown) {
      console.error('Failed to load rule database:', err);
      setError(err instanceof Error ? err.message : 'Failed to load rule database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleStatus = async (rule: RuleItem) => {
    try {
      setTogglingId(rule.rule_id);
      const newStatus = rule.rule_status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const updated = await updateRuleStatus(rule.rule_id, newStatus);
      setRules((prev) =>
        prev.map((r) => (r.rule_id === rule.rule_id ? updated : r))
      );
      const stats = await fetchRuleStatistics();
      setStatistics(stats);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update rule status');
    } finally {
      setTogglingId(null);
    }
  };

  // Filter rules in memory
  const filteredRules = rules.filter((r) => {
    const matchesSearch =
      search === '' ||
      r.rule_id.toLowerCase().includes(search.toLowerCase()) ||
      r.rule_reference.toLowerCase().includes(search.toLowerCase()) ||
      r.requirement_description.toLowerCase().includes(search.toLowerCase()) ||
      r.declaration_type.toLowerCase().includes(search.toLowerCase()) ||
      r.source_section.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' || r.rule_status === statusFilter;

    const matchesFamily =
      familyFilter === 'ALL' || r.rule_family === familyFilter;

    return matchesSearch && matchesStatus && matchesFamily;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success">Active</Badge>;
      case 'REVIEW_REQUIRED':
        return <Badge variant="warning">Review Required</Badge>;
      case 'FUTURE':
        return <Badge variant="purple">Future Rule</Badge>;
      case 'HISTORICAL':
        return <Badge variant="neutral">Historical Guard</Badge>;
      case 'INACTIVE':
      default:
        return <Badge variant="neutral">Inactive</Badge>;
    }
  };

  const getMandatoryBadge = (status: string) => {
    switch (status) {
      case 'MANDATORY':
        return (
          <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
            Mandatory
          </span>
        );
      case 'CONDITIONAL':
        return (
          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
            Conditional
          </span>
        );
      case 'NOT_APPLICABLE':
        return (
          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
            Not Applicable
          </span>
        );
      case 'OPTIONAL':
        return (
          <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
            Optional
          </span>
        );
      case 'REQUIRES_INSPECTOR_REVIEW':
      default:
        return (
          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
            Official Review
          </span>
        );
    }
  };

  const columns: Column<RuleItem>[] = [
    {
      header: 'Rule ID',
      accessor: 'rule_id',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
          {row.rule_id}
        </span>
      ),
    },
    {
      header: 'Statutory Reference',
      accessor: 'rule_reference',
      render: (row) => (
        <div>
          <div className="font-bold text-xs text-slate-900">{row.rule_reference}</div>
          <div className="text-[11px] text-slate-500">{row.source_section}</div>
        </div>
      ),
    },
    {
      header: 'Requirement & Scope',
      render: (row) => (
        <div className="max-w-md">
          <div className="font-semibold text-xs text-slate-800 leading-snug">
            {row.requirement_description}
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
              {row.package_context}
            </span>
            {getMandatoryBadge(row.mandatory_status)}
            {row.inspector_review_required && (
              <span
                className="text-[10px] text-amber-700 bg-amber-50 px-1 rounded flex items-center gap-0.5"
                title="Requires Legal Metrology Inspector Review"
              >
                <AlertTriangle className="w-2.5 h-2.5 inline" /> Review Required
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Rule Family',
      accessor: 'rule_family',
      render: (row) => (
        <span className="font-mono text-[11px] font-medium text-slate-700 px-2 py-0.5 bg-slate-100 rounded">
          {row.rule_family}
        </span>
      ),
    },
    {
      header: 'Status',
      render: (row) => getStatusBadge(row.rule_status),
    },
    {
      header: 'Action',
      render: (row) => (
        <div className="flex items-center space-x-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedRule(row)}
            className="text-xs p-1"
            title="Inspect Statutory Metadata"
          >
            <Eye className="w-4 h-4 text-blue-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={togglingId === row.rule_id}
            onClick={() => handleToggleStatus(row)}
            className="text-xs p-1"
            title="Toggle Active/Inactive"
          >
            {row.rule_status === 'ACTIVE' ? (
              <ToggleRight className="w-5 h-5 text-emerald-600" />
            ) : (
              <ToggleLeft className="w-5 h-5 text-slate-400" />
            )}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="LMPC Rule Database Governance"
        subtitle="Supervisory oversight of codified Legal Metrology rules, statutory amendments, and deterministic engine applicability"
        badge={<Badge variant="purple">Deterministic Engine v1.0</Badge>}
        breadcrumbs={[
          { label: 'Supervisory Dashboard', href: '/controller/dashboard' },
          { label: 'Rule Database' },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            onClick={loadData}
          >
            Refresh Dataset
          </Button>
        }
      />

      {/* KPI Overview Cards */}
      {statistics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Total Rules</span>
              <Database className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-1 text-2xl font-black text-slate-900">{statistics.totalRules}</div>
            <span className="text-[10px] text-slate-400">Baseline v0.1 &bull; 100% Ingested</span>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Active In Engine</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-1 text-2xl font-black text-emerald-700">{statistics.activeRules}</div>
            <span className="text-[10px] text-emerald-600 font-medium">Currently Governing</span>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Review Required</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-1 text-2xl font-black text-amber-700">{statistics.reviewRequiredRules}</div>
            <span className="text-[10px] text-amber-600 font-medium">Statutory Official Review</span>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Future Rules</span>
              <Clock className="w-4 h-4 text-purple-600" />
            </div>
            <div className="mt-1 text-2xl font-black text-purple-700">{statistics.futureRules}</div>
            <span className="text-[10px] text-purple-600 font-medium">2027 Amendment Inactive</span>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Historical Guards</span>
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="mt-1 text-2xl font-black text-indigo-700">{statistics.historicalGuards}</div>
            <span className="text-[10px] text-indigo-600 font-medium">Rule 5 / Schedule 2 Guard</span>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search rule ID, section, description, or declaration..."
                className="w-full text-xs px-3 py-2 pl-9 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs px-2.5 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Only</option>
                <option value="REVIEW_REQUIRED">Review Required</option>
                <option value="FUTURE">Future Rules</option>
                <option value="HISTORICAL">Historical Guards</option>
                <option value="INACTIVE">Inactive</option>
              </select>

              <select
                value={familyFilter}
                onChange={(e) => setFamilyFilter(e.target.value)}
                className="text-xs px-2.5 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Families</option>
                <option value="DECLARATION">DECLARATION</option>
                <option value="WHOLESALE">WHOLESALE</option>
                <option value="EXEMPTION">EXEMPTION</option>
                <option value="APPLICABILITY">APPLICABILITY</option>
                <option value="PACKAGE_STRUCTURE">PACKAGE_STRUCTURE</option>
                <option value="E_COMMERCE">E_COMMERCE</option>
                <option value="IMPORT">IMPORT</option>
                <option value="MEASUREMENT">MEASUREMENT</option>
                <option value="CROSS_REGULATORY_OVERLAY">CROSS_REGULATORY_OVERLAY</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rules Table */}
      <Card>
        <CardHeader
          title="Authoritative LMPC Rules (v1.0)"
          subtitle={`Showing ${filteredRules.length} of ${rules.length} statutory rule records`}
          action={
            <span className="text-xs text-slate-500 font-mono">
              Database: SIH26034_LMPC_Rule_Database v1.0
            </span>
          }
        />
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500">
              <RefreshCw className="w-5 h-5 text-blue-600 animate-spin mx-auto mb-2" />
              Loading authoritative rule dataset from MongoDB Atlas...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-xs text-red-600">
              <AlertTriangle className="w-5 h-5 mx-auto mb-2" />
              {error}
            </div>
          ) : (
            <Table
              columns={columns}
              data={filteredRules}
              keyExtractor={(row) => row.rule_id}
            />
          )}
        </CardContent>
      </Card>

      {/* Rule Detail Modal / Drawer */}
      {selectedRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {selectedRule.rule_id}
                </span>
                <h3 className="font-bold text-sm text-slate-900">
                  {selectedRule.rule_reference}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRule(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  Requirement Description
                </span>
                <p className="font-semibold text-slate-900 mt-0.5 text-sm leading-relaxed">
                  {selectedRule.requirement_description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 font-medium">Declaration Type:</span>
                  <div className="font-mono font-bold text-slate-800">{selectedRule.declaration_type}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Rule Family:</span>
                  <div className="font-mono font-bold text-slate-800">{selectedRule.rule_family}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Mandatory Status:</span>
                  <div className="mt-0.5">{getMandatoryBadge(selectedRule.mandatory_status)}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Operational Status:</span>
                  <div className="mt-0.5">{getStatusBadge(selectedRule.rule_status)}</div>
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  Human Condition / Scope Explanation
                </span>
                <p className="text-slate-700 bg-blue-50/50 p-2.5 rounded border border-blue-100 mt-1 leading-relaxed">
                  {selectedRule.human_condition_text}
                </p>
              </div>

              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  Machine Applicability Condition
                </span>
                <div className="font-mono text-[11px] bg-slate-900 text-emerald-400 p-2.5 rounded mt-1 overflow-x-auto">
                  {selectedRule.applicability_conditions}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 font-medium">OCR Extraction Field:</span>
                  <div className="font-mono text-slate-800">
                    {selectedRule.ocr_field || <span className="text-slate-400 italic">None (Legal Context)</span>}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Safe Validation Handler:</span>
                  <div className="font-mono text-purple-700 font-semibold">
                    {selectedRule.validation_function}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg space-y-1.5">
                <div className="flex items-center text-amber-800 font-bold text-xs gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  Statutory Source Citation
                </div>
                <div className="text-slate-700">
                  <span className="font-medium">Document:</span> {selectedRule.source_document}
                </div>
                <div className="text-slate-700">
                  <span className="font-medium">Section:</span> {selectedRule.source_section}
                </div>
                {selectedRule.amendment_version && (
                  <div className="text-slate-700">
                    <span className="font-medium">Amendment Gazette:</span> {selectedRule.amendment_version}
                  </div>
                )}
                {selectedRule.source_url && (
                  <div className="pt-1">
                    <a
                      href={selectedRule.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 font-bold hover:underline inline-flex items-center gap-1"
                    >
                      View Official Gazette Source <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {selectedRule.notes && (
                <div className="text-slate-500 italic text-[11px] bg-slate-50 p-2 rounded">
                  <strong>Notes:</strong> {selectedRule.notes}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <Button variant="primary" size="sm" onClick={() => setSelectedRule(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
