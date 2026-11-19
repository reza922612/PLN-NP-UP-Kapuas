import React, { useMemo, useState } from 'react';
import { useEmployees } from '../../hooks/useEmployees';
import {
  Users,
  User,
  ShieldCheck,
  Building2,
  Trophy,
  Search,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Mail,
  Phone,
  ExternalLink,
  X,
  GitFork,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  UserCheck,
  ArrowUpRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Employee } from '../../types';
import { cn } from '../../lib/utils';
import { PageHeader, EmptyState, CardGridSkeleton } from '../common/DashboardUI';
import { StoredImage } from '../common/StoredFileUI';

interface OrgStructureProps {
  onSelectEmployee?: (emp: Employee) => void;
}

type OrgViewMode = 'tree' | 'tiers';

interface OrgTreeNode {
  key: string;
  employee: Employee;
  isVirtual?: boolean;
  children: OrgTreeNode[];
  matchesFilter: boolean;
}

const getRoleTierRank = (jabatan: string): number => {
  const j = (jabatan || '').toLowerCase();
  if (j.includes('manager unit') || j.includes('manajer unit') || j.includes('manager up')) return 0;
  if (j.includes('assistant manager') || j.includes('asman')) return 1;
  if (j.includes('team leader') || j.includes('tl ')) return 2;
  return 3;
};

const isExecutiveTitle = (jabatan: string): boolean => {
  const j = (jabatan || '').toLowerCase();
  return (
    j.includes('manager') ||
    j.includes('manajer') ||
    j.includes('kepala') ||
    j.includes('direktur') ||
    j.includes('pimpinan')
  );
};

const countSubtreeDescendants = (node: OrgTreeNode): number => {
  let total = node.children.length;
  for (const child of node.children) {
    total += countSubtreeDescendants(child);
  }
  return total;
};

const OrgStructure: React.FC<OrgStructureProps> = ({ onSelectEmployee }) => {
  const { employees, loading } = useEmployees();
  const [viewMode, setViewMode] = useState<OrgViewMode>('tree');
  const [selectedUnit, setSelectedUnit] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllStaff, setShowAllStaff] = useState(false);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(() => new Set());
  const [zoom, setZoom] = useState(1);
  const [inspectedEmployee, setInspectedEmployee] = useState<Employee | null>(null);

  const unitOptions = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => e.unitPelaksana && set.add(e.unitPelaksana));
    return Array.from(set).sort();
  }, [employees]);

  const employeeMatchesFilter = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return (e: Employee) => {
      const matchUnit = selectedUnit === 'ALL' || e.unitPelaksana === selectedUnit;
      const matchSearch =
        !q ||
        e.fullName.toLowerCase().includes(q) ||
        (e.jabatanLengkap || '').toLowerCase().includes(q) ||
        (e.subUnit || '').toLowerCase().includes(q) ||
        (e.atasanNama || '').toLowerCase().includes(q) ||
        (e.nip || '').toLowerCase().includes(q);
      return matchUnit && matchSearch;
    };
  }, [selectedUnit, searchTerm]);

  const filteredEmployees = useMemo(
    () => employees.filter(employeeMatchesFilter),
    [employees, employeeMatchesFilter]
  );

  // Lookup maps across all employees so supervisor relationships resolve cleanly
  const { byId, byNameLower } = useMemo(() => {
    const idMap = new Map<string, Employee>();
    const nameMap = new Map<string, Employee>();
    employees.forEach((emp) => {
      if (emp.id) idMap.set(emp.id, emp);
      if (emp.fullName) nameMap.set(emp.fullName.trim().toLowerCase(), emp);
    });
    return { byId: idMap, byNameLower: nameMap };
  }, [employees]);

  const resolveSupervisor = useMemo(() => {
    return (emp: Employee): Employee | undefined => {
      if (emp.atasanId && emp.atasanId !== emp.id && byId.has(emp.atasanId)) {
        return byId.get(emp.atasanId);
      }
      if (emp.atasanNama) {
        const matched = byNameLower.get(emp.atasanNama.trim().toLowerCase());
        if (matched && matched.id !== emp.id) {
          return matched;
        }
      }
      return undefined;
    };
  }, [byId, byNameLower]);

  // Build hierarchical organization tree synced with atasanId / atasanNama
  const treeModel = useMemo(() => {
    const nodesMap = new Map<string, OrgTreeNode>();
    const parentOfKey = new Map<string, string | null>();
    const hasFilter = selectedUnit !== 'ALL' || searchTerm.trim().length > 0;

    employees.forEach((emp, idx) => {
      const key = emp.id || `emp-${idx}`;
      nodesMap.set(key, {
        key,
        employee: emp,
        children: [],
        matchesFilter: employeeMatchesFilter(emp),
      });
      parentOfKey.set(key, null);
    });

    // Attach children to resolved registered supervisors or virtual manual supervisors
    employees.forEach((emp, idx) => {
      const childKey = emp.id || `emp-${idx}`;
      const supervisor = resolveSupervisor(emp);
      if (supervisor && supervisor.id && nodesMap.has(supervisor.id)) {
        parentOfKey.set(childKey, supervisor.id);
      } else if (emp.atasanNama && emp.atasanNama.trim().length > 0) {
        const virtualKey = `virtual:${emp.atasanNama.trim().toLowerCase()}`;
        if (!nodesMap.has(virtualKey)) {
          nodesMap.set(virtualKey, {
            key: virtualKey,
            isVirtual: true,
            matchesFilter: false,
            children: [],
            employee: {
              id: virtualKey,
              fullName: emp.atasanNama.trim(),
              nip: '-',
              unitPelaksana: emp.unitPelaksana || 'UP Kapuas',
              subUnit: '',
              jabatanLengkap: emp.atasanJabatan?.trim() || 'Atasan Langsung',
              personGrade: '-',
              positionGrade: '-',
              tanggalMasuk: '',
              tanggalCalonPegawai: '',
              emailKorporat: '',
              alamatLengkap: '',
              tanggalLahir: '',
              tanggalMulaiJabatan: '',
              tanggalPengangkatan: '',
              tanggalPensiunNormal: '',
              jenisKelamin: 'Laki-laki',
              agama: '',
              noTelepon: '',
              noNPWP: '',
              noKTP: '',
              noBPJSKesehatan: '',
              noBPJSKetenagakerjaan: '',
              pendidikanTerakhir: '',
              status: 'Pegawai Organik',
              perusahaan: 'PT PLN Nusantara Power',
              createdAt: null,
              updatedAt: null,
            },
          });
          parentOfKey.set(virtualKey, null);
        }
        parentOfKey.set(childKey, virtualKey);
      }
    });

    // Cycle check helper before building children arrays
    const wouldCreateCycle = (childKey: string, targetParentKey: string): boolean => {
      let cur: string | null | undefined = targetParentKey;
      const visited = new Set<string>([childKey]);
      while (cur) {
        if (visited.has(cur)) return true;
        visited.add(cur);
        cur = parentOfKey.get(cur);
      }
      return false;
    };

    nodesMap.forEach((node, key) => {
      const pKey = parentOfKey.get(key);
      if (pKey && nodesMap.has(pKey) && !wouldCreateCycle(key, pKey)) {
        nodesMap.get(pKey)!.children.push(node);
      } else {
        parentOfKey.set(key, null);
      }
    });

    // Sort children cleanly by role tier then alphabetically
    const sortTree = (node: OrgTreeNode) => {
      node.children.sort((a, b) => {
        const rankDiff =
          getRoleTierRank(a.employee.jabatanLengkap) - getRoleTierRank(b.employee.jabatanLengkap);
        if (rankDiff !== 0) return rankDiff;
        return a.employee.fullName.localeCompare(b.employee.fullName);
      });
      node.children.forEach(sortTree);
    };

    const allRoots: OrgTreeNode[] = [];
    nodesMap.forEach((node, key) => {
      if (parentOfKey.get(key) === null) {
        sortTree(node);
        allRoots.push(node);
      }
    });

    // Filter tree while preserving ancestor path for matching descendants
    const pruneNode = (node: OrgTreeNode): OrgTreeNode | null => {
      const prunedChildren = node.children
        .map(pruneNode)
        .filter((c): c is OrgTreeNode => c !== null);

      if (!hasFilter || node.matchesFilter || prunedChildren.length > 0) {
        return {
          ...node,
          children: prunedChildren,
        };
      }
      return null;
    };

    const visibleRoots = allRoots
      .map(pruneNode)
      .filter((r): r is OrgTreeNode => r !== null)
      .sort((a, b) => {
        const subDiff = countSubtreeDescendants(b) - countSubtreeDescendants(a);
        if (subDiff !== 0) return subDiff;
        const rankDiff =
          getRoleTierRank(a.employee.jabatanLengkap) - getRoleTierRank(b.employee.jabatanLengkap);
        if (rankDiff !== 0) return rankDiff;
        return a.employee.fullName.localeCompare(b.employee.fullName);
      });

    const anyReportingLinksConfigured = employees.some(
      (e) => Boolean(e.atasanId) || Boolean(e.atasanNama?.trim())
    );

    const structuredRoots: OrgTreeNode[] = [];
    const unlinkedEmployees: Employee[] = [];

    visibleRoots.forEach((root) => {
      const hasSubordinates = root.children.length > 0;
      const isTopLeader =
        isExecutiveTitle(root.employee.jabatanLengkap) || getRoleTierRank(root.employee.jabatanLengkap) === 0;

      if (hasSubordinates || isTopLeader || !anyReportingLinksConfigured) {
        structuredRoots.push(root);
      } else if (!root.isVirtual) {
        unlinkedEmployees.push(root.employee);
      }
    });

    const parentKeysWithChildren: string[] = [];
    const collectExpandableKeys = (node: OrgTreeNode) => {
      if (node.children.length > 0) {
        parentKeysWithChildren.push(node.key);
        node.children.forEach(collectExpandableKeys);
      }
    };
    structuredRoots.forEach(collectExpandableKeys);

    const linkedEmployeeCount = employees.filter(
      (e) => Boolean(resolveSupervisor(e)) || Boolean(e.atasanNama?.trim())
    ).length;

    return {
      structuredRoots,
      unlinkedEmployees,
      parentKeysWithChildren,
      linkedEmployeeCount,
    };
  }, [employees, employeeMatchesFilter, resolveSupervisor, selectedUnit, searchTerm]);

  // Flat level-based hierarchy fallback view
  const tierHierarchy = useMemo(() => {
    return {
      managers: filteredEmployees.filter((e) => getRoleTierRank(e.jabatanLengkap) === 0),
      asmans: filteredEmployees.filter((e) => getRoleTierRank(e.jabatanLengkap) === 1),
      tls: filteredEmployees.filter((e) => getRoleTierRank(e.jabatanLengkap) === 2),
      staffs: filteredEmployees.filter((e) => getRoleTierRank(e.jabatanLengkap) === 3),
    };
  }, [filteredEmployees]);

  // Modal details: supervisor + direct subordinates for inspectedEmployee
  const inspectedSupervisor = useMemo(() => {
    if (!inspectedEmployee) return undefined;
    return resolveSupervisor(inspectedEmployee);
  }, [inspectedEmployee, resolveSupervisor]);

  const inspectedSubordinates = useMemo(() => {
    if (!inspectedEmployee?.id) return [];
    return employees
      .filter((e) => {
        const sup = resolveSupervisor(e);
        return sup?.id === inspectedEmployee.id;
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [employees, inspectedEmployee, resolveSupervisor]);

  const toggleNodeCollapse = (key: string) => {
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandAllBranches = () => setCollapsedNodes(new Set());
  const collapseAllBranches = () => setCollapsedNodes(new Set(treeModel.parentKeysWithChildren));

  const NodeCard: React.FC<{
    employee: Employee;
    tier: 'top' | 'mid' | 'lead' | 'staff';
    isVirtual?: boolean;
    subordinateCount?: number;
    isExpanded?: boolean;
    onToggleExpand?: () => void;
    highlightMatch?: boolean;
    showSupervisorLine?: boolean;
  }> = ({
    employee,
    tier,
    isVirtual,
    subordinateCount = 0,
    isExpanded = true,
    onToggleExpand,
    highlightMatch,
    showSupervisorLine,
  }) => {
    const resolvedSup = !isVirtual ? resolveSupervisor(employee) : undefined;
    const supLabel = resolvedSup?.fullName || employee.atasanNama;

    return (
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'corporate-card p-3.5 w-[250px] sm:w-[270px] relative transition-all text-left',
            !isVirtual && 'hover:border-[#0072BC] dark:hover:border-[#72C8F1] hover:-translate-y-0.5',
            tier === 'top' && 'border-t-4 border-t-[#F9D423] shadow-md',
            tier === 'mid' && 'border-t-4 border-t-[#0072BC]',
            tier === 'lead' && 'border-t-4 border-t-[#72C8F1]',
            tier === 'staff' && 'border-t-2 border-t-slate-300 dark:border-t-slate-700',
            isVirtual && 'bg-slate-50/90 dark:bg-slate-800/70 border-dashed',
            highlightMatch && searchTerm.trim() && 'ring-2 ring-[#0072BC]/60 dark:ring-[#72C8F1]/60'
          )}
        >
          <button
            type="button"
            disabled={isVirtual}
            onClick={() => !isVirtual && setInspectedEmployee(employee)}
            className="w-full text-left flex items-center gap-3 disabled:cursor-default"
          >
            <div
              className={cn(
                'w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden shrink-0 font-extrabold text-sm',
                tier === 'top'
                  ? 'bg-amber-50 dark:bg-[#F9D423]/15 text-amber-600 dark:text-[#F9D423]'
                  : 'bg-[#EAF6FC] dark:bg-[#0072BC]/20 text-[#0072BC] dark:text-[#72C8F1]'
              )}
            >
              {employee.photoUrl ? (
                <StoredImage
                  src={employee.photoUrl}
                  alt={employee.fullName}
                  className="w-full h-full object-cover"
                  fallback={employee.fullName?.[0]?.toUpperCase() || <User size={20} />}
                />
              ) : (
                employee.fullName?.[0]?.toUpperCase() || <User size={20} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-extrabold text-[#173B65] dark:text-slate-100 truncate pr-4">
                {employee.fullName}
              </h4>
              <p
                className={cn(
                  'text-[11px] font-bold truncate mt-0.5',
                  tier === 'top'
                    ? 'text-amber-600 dark:text-[#F9D423]'
                    : 'text-[#0072BC] dark:text-[#72C8F1]'
                )}
              >
                {employee.jabatanLengkap || 'Staf Pelaksana'}
              </p>
              <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                {employee.subUnit || employee.unitPelaksana}
              </p>
            </div>
          </button>

          {tier === 'top' && (
            <Trophy
              size={14}
              className="absolute top-3 right-3 text-amber-500 dark:text-[#F9D423] pointer-events-none"
            />
          )}

          {showSupervisorLine && supLabel && (
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
              <UserCheck size={11} className="text-[#0072BC] dark:text-[#72C8F1] shrink-0" />
              <span className="truncate">Atasan: {supLabel}</span>
            </div>
          )}

          {subordinateCount > 0 && onToggleExpand && (
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                {subordinateCount} Bawahan Langsung
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand();
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EAF6FC] dark:bg-[#0072BC]/20 text-[#0072BC] dark:text-[#72C8F1] text-[10px] font-bold hover:bg-[#0072BC] hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                {isExpanded ? 'Tutup' : 'Buka'}
                {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTreeBranch = (node: OrgTreeNode, depth: number = 0): React.ReactNode => {
    const rank = getRoleTierRank(node.employee.jabatanLengkap);
    const tier: 'top' | 'mid' | 'lead' | 'staff' =
      depth === 0 && (rank === 0 || node.children.length > 0)
        ? 'top'
        : rank === 1
        ? 'mid'
        : rank === 2
        ? 'lead'
        : 'staff';

    const hasChildren = node.children.length > 0;
    const isExpanded = !collapsedNodes.has(node.key);

    return (
      <div key={node.key} className="inline-flex flex-col items-center">
        <NodeCard
          employee={node.employee}
          tier={tier}
          isVirtual={node.isVirtual}
          subordinateCount={node.children.length}
          isExpanded={isExpanded}
          onToggleExpand={hasChildren ? () => toggleNodeCollapse(node.key) : undefined}
          highlightMatch={node.matchesFilter}
        />

        {hasChildren && isExpanded && (
          <div className="flex flex-col items-center">
            {/* Vertical stem down from parent */}
            <div className="w-px h-6 bg-[#72C8F1]/80 dark:bg-[#0072BC]/70" />

            {/* Children row with horizontal bridge connectors */}
            <div className="flex items-start justify-center">
              {node.children.map((child, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === node.children.length - 1;
                const isOnly = node.children.length === 1;

                return (
                  <div key={child.key} className="flex flex-col items-center relative px-2.5">
                    {!isOnly && (
                      <div className="w-full h-px flex">
                        <div
                          className={cn(
                            'w-1/2 h-px',
                            isFirst ? 'bg-transparent' : 'bg-[#72C8F1]/80 dark:bg-[#0072BC]/70'
                          )}
                        />
                        <div
                          className={cn(
                            'w-1/2 h-px',
                            isLast ? 'bg-transparent' : 'bg-[#72C8F1]/80 dark:bg-[#0072BC]/70'
                          )}
                        />
                      </div>
                    )}
                    <div className="w-px h-6 bg-[#72C8F1]/80 dark:bg-[#0072BC]/70" />
                    {renderTreeBranch(child, depth + 1)}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Struktur Organisasi UP Kapuas"
          subtitle="Menyusun hierarki jabatan dan relasi atasan pegawai..."
          icon={ShieldCheck}
        />
        <CardGridSkeleton count={6} />
      </div>
    );
  }

  const displayedStaffs = showAllStaff ? tierHierarchy.staffs : tierHierarchy.staffs.slice(0, 12);

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Struktur Organisasi UP Kapuas"
        subtitle="Hierarki otomatis tersinkron berdasarkan relasi Atasan Langsung pada Data Kepegawaian"
        icon={ShieldCheck}
        badge={`${filteredEmployees.length} Personel · ${treeModel.linkedEmployeeCount} Tersinkron Atasan`}
      />

      {/* Filter & View Mode Bar */}
      <div className="corporate-card p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama pejabat, NIP, jabatan, atau nama atasan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
            />
          </div>

          <div className="flex items-center gap-2 px-3 py-2 bg-[#F4F8FB] dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
            <Building2 size={14} className="text-[#0072BC] dark:text-[#72C8F1] shrink-0" />
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="bg-transparent text-xs font-bold text-[#173B65] dark:text-slate-200 outline-none"
            >
              <option value="ALL" className="dark:bg-slate-900">
                Semua Unit Pelaksana
              </option>
              {unitOptions.map((u) => (
                <option key={u} value={u} className="dark:bg-slate-900">
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center gap-1 p-1 bg-[#F4F8FB] dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('tree')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0',
              viewMode === 'tree'
                ? 'bg-white dark:bg-[#0E1A2E] text-[#0072BC] dark:text-[#72C8F1] shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-[#173B65] dark:hover:text-slate-200'
            )}
          >
            <GitFork size={13} />
            Bagan Atasan
          </button>
          <button
            type="button"
            onClick={() => setViewMode('tiers')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0',
              viewMode === 'tiers'
                ? 'bg-white dark:bg-[#0E1A2E] text-[#0072BC] dark:text-[#72C8F1] shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-[#173B65] dark:hover:text-slate-200'
            )}
          >
            <Layers size={13} />
            Level Jabatan
          </button>
        </div>
      </div>

      {filteredEmployees.length === 0 ? (
        <div className="corporate-card">
          <EmptyState
            icon={ShieldCheck}
            title="Struktur organisasi tidak ditemukan"
            description="Sesuaikan filter unit atau kata kunci pencarian jabatan untuk melihat hierarki."
          />
        </div>
      ) : viewMode === 'tree' ? (
        <div className="space-y-6">
          {/* Tree Controls Toolbar */}
          <div className="corporate-card p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
              <span>Klik kartu pegawai untuk melihat profil, atasan, dan daftar bawahan langsung</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {treeModel.parentKeysWithChildren.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={expandAllBranches}
                    className="px-3 py-1.5 rounded-lg bg-[#EAF6FC] dark:bg-[#0072BC]/20 text-[#0072BC] dark:text-[#72C8F1] text-xs font-bold hover:bg-[#0072BC] hover:text-white transition-colors whitespace-nowrap shrink-0"
                  >
                    Buka Semua Cabang
                  </button>
                  <button
                    type="button"
                    onClick={collapseAllBranches}
                    className="px-3 py-1.5 rounded-lg bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:border-[#0072BC] transition-colors whitespace-nowrap shrink-0"
                  >
                    Ringkas Cabang
                  </button>
                </>
              )}

              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.1).toFixed(2))))}
                  className="p-1 text-slate-500 hover:text-[#0072BC] dark:text-slate-300"
                  title="Perkecil Bagan"
                >
                  <ZoomOut size={14} />
                </button>
                <span className="text-[11px] font-bold font-mono tabular-nums text-[#173B65] dark:text-slate-200 min-w-[42px] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(1.2, Number((z + 0.1).toFixed(2))))}
                  className="p-1 text-slate-500 hover:text-[#0072BC] dark:text-slate-300"
                  title="Perbesar Bagan"
                >
                  <ZoomIn size={14} />
                </button>
                {zoom !== 1 && (
                  <button
                    type="button"
                    onClick={() => setZoom(1)}
                    className="p-1 text-slate-400 hover:text-[#0072BC]"
                    title="Reset Zoom"
                  >
                    <RotateCcw size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Org Tree Canvas */}
          {treeModel.structuredRoots.length > 0 ? (
            <div className="corporate-card p-6 sm:p-8 overflow-x-auto bg-[#F8FBFD] dark:bg-[#0B172A]/60">
              <div
                className="min-w-max flex flex-wrap justify-center gap-12 transition-transform duration-150"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top center',
                }}
              >
                {treeModel.structuredRoots.map((root) => renderTreeBranch(root, 0))}
              </div>
            </div>
          ) : (
            <div className="corporate-card">
              <EmptyState
                icon={GitFork}
                title="Belum Ada Hirarki Atasan Terhubung"
                description="Isi kolom Atasan Langsung Pegawai pada menu Input / Edit Pegawai di bagian 2. Data Kepegawaian & Jabatan agar bagan tersusun otomatis."
              />
            </div>
          )}

          {/* Unlinked Employees Section */}
          {treeModel.unlinkedEmployees.length > 0 && (
            <div className="corporate-card p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-extrabold text-[#173B65] dark:text-slate-100">
                    Pegawai Belum Terhubung ke Atasan ({treeModel.unlinkedEmployees.length})
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Pilih Atasan Langsung pada menu Edit Pegawai bagian 2. Data Kepegawaian &amp; Jabatan untuk menyusun posisi mereka di bagan pohon
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {treeModel.unlinkedEmployees.map((emp) => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => setInspectedEmployee(emp)}
                    className="text-left p-3 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 hover:border-[#0072BC] transition-colors flex items-center gap-3"
                  >
                    <div className="w-9 h-9 rounded-lg bg-white dark:bg-[#0E1A2E] text-[#0072BC] dark:text-[#72C8F1] font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden border border-slate-200 dark:border-slate-700">
                      {emp.photoUrl ? (
                        <StoredImage
                          src={emp.photoUrl}
                          alt={emp.fullName}
                          className="w-full h-full object-cover"
                          fallback={emp.fullName?.[0]?.toUpperCase() || 'P'}
                        />
                      ) : (
                        emp.fullName?.[0]?.toUpperCase() || 'P'
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#173B65] dark:text-slate-100 truncate">
                        {emp.fullName}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {emp.jabatanLengkap || 'Staf'}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{emp.unitPelaksana}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8 pt-2">
          {/* Level 0: Manajer Unit */}
          <div className="flex flex-col items-center space-y-4">
            <div className="text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-[#F9D423]">
                Level 1 · Manajerial Unit ({tierHierarchy.managers.length})
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-5 w-full">
              {tierHierarchy.managers.length > 0 ? (
                tierHierarchy.managers.map((m) => (
                  <NodeCard key={m.id} employee={m} tier="top" showSupervisorLine />
                ))
              ) : (
                <p className="text-xs text-slate-400">Tidak ada jabatan Manajer Unit pada filter ini.</p>
              )}
            </div>
          </div>

          <div className="w-px h-8 bg-[#72C8F1]/60 mx-auto" />

          {/* Level 1: Assistant Manager */}
          <div className="flex flex-col items-center space-y-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0072BC] dark:text-[#72C8F1]">
              Level 2 · Assistant Manager ({tierHierarchy.asmans.length})
            </span>
            <div className="flex flex-wrap justify-center gap-4 w-full">
              {tierHierarchy.asmans.length > 0 ? (
                tierHierarchy.asmans.map((m) => (
                  <NodeCard key={m.id} employee={m} tier="mid" showSupervisorLine />
                ))
              ) : (
                <p className="text-xs text-slate-400">Tidak ada Assistant Manager pada filter ini.</p>
              )}
            </div>
          </div>

          <div className="w-px h-8 bg-[#72C8F1]/60 mx-auto" />

          {/* Level 2: Team Leaders */}
          <div className="flex flex-col items-center space-y-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#173B65] dark:text-slate-200">
              Level 3 · Team Leader ({tierHierarchy.tls.length})
            </span>
            <div className="flex flex-wrap justify-center gap-4 w-full">
              {tierHierarchy.tls.length > 0 ? (
                tierHierarchy.tls.map((m) => (
                  <NodeCard key={m.id} employee={m} tier="lead" showSupervisorLine />
                ))
              ) : (
                <p className="text-xs text-slate-400">Tidak ada Team Leader pada filter ini.</p>
              )}
            </div>
          </div>

          <div className="w-px h-8 bg-[#72C8F1]/60 mx-auto" />

          {/* Level 3: Staff Pelaksana */}
          <div className="corporate-card p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-[#173B65] dark:text-slate-100">
                  Staf &amp; Pelaksana Operasional ({tierHierarchy.staffs.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Klik kartu pegawai untuk meninjau profil jabatan, atasan, dan kontak singkat
                </p>
              </div>
              {tierHierarchy.staffs.length > 12 && (
                <button
                  type="button"
                  onClick={() => setShowAllStaff((p) => !p)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#EAF6FC] dark:bg-[#0072BC]/20 text-[#0072BC] dark:text-[#72C8F1] rounded-xl text-xs font-bold hover:bg-[#0072BC] hover:text-white transition-colors whitespace-nowrap shrink-0"
                >
                  <Users size={14} />
                  {showAllStaff
                    ? 'Tampilkan Lebih Sedikit'
                    : `Tampilkan Semua (${tierHierarchy.staffs.length})`}
                  {showAllStaff ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {displayedStaffs.map((m) => {
                const sup = resolveSupervisor(m);
                const supName = sup?.fullName || m.atasanNama;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setInspectedEmployee(m)}
                    className="text-left p-3 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 hover:border-[#0072BC] transition-colors flex items-center gap-3"
                  >
                    <div className="w-9 h-9 rounded-lg bg-white dark:bg-[#0E1A2E] text-[#0072BC] dark:text-[#72C8F1] font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden border border-slate-200 dark:border-slate-700">
                      {m.photoUrl ? (
                        <StoredImage
                          src={m.photoUrl}
                          alt={m.fullName}
                          className="w-full h-full object-cover"
                          fallback={m.fullName?.[0]?.toUpperCase() || 'S'}
                        />
                      ) : (
                        m.fullName?.[0]?.toUpperCase() || 'S'
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#173B65] dark:text-slate-100 truncate">
                        {m.fullName}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {m.jabatanLengkap}
                      </p>
                      {supName && (
                        <p className="text-[10px] text-[#0072BC] dark:text-[#72C8F1] font-medium truncate">
                          Atasan: {supName}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Quick Profile Modal */}
      <AnimatePresence>
        {inspectedEmployee && (
          <div
            className="fixed inset-0 z-50 bg-[#071120]/65 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setInspectedEmployee(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="corporate-card max-w-md w-full p-6 space-y-5 relative max-h-[90vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => setInspectedEmployee(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={16} />
              </button>

              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[#EAF6FC] dark:bg-[#0072BC]/20 text-[#0072BC] dark:text-[#72C8F1] flex items-center justify-center font-extrabold text-xl overflow-hidden shrink-0">
                  {inspectedEmployee.photoUrl ? (
                    <StoredImage
                      src={inspectedEmployee.photoUrl}
                      alt={inspectedEmployee.fullName}
                      className="w-full h-full object-cover"
                      fallback={inspectedEmployee.fullName?.[0]?.toUpperCase() || 'P'}
                    />
                  ) : (
                    inspectedEmployee.fullName?.[0]?.toUpperCase() || 'P'
                  )}
                </div>
                <div className="min-w-0 pr-6">
                  <h4 className="text-base font-extrabold text-[#173B65] dark:text-slate-100 truncate">
                    {inspectedEmployee.fullName}
                  </h4>
                  <p className="text-xs font-bold text-[#0072BC] dark:text-[#72C8F1]">
                    {inspectedEmployee.jabatanLengkap}
                  </p>
                  <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                    NIP {inspectedEmployee.nip}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                  <Building2 size={14} className="text-[#0072BC] dark:text-[#72C8F1] shrink-0" />
                  <span>
                    {inspectedEmployee.unitPelaksana} · {inspectedEmployee.subUnit}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                  <Mail size={14} className="text-[#0072BC] dark:text-[#72C8F1] shrink-0" />
                  <span className="truncate">{inspectedEmployee.emailKorporat || '-'}</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                  <Phone size={14} className="text-[#0072BC] dark:text-[#72C8F1] shrink-0" />
                  <span className="font-mono">{inspectedEmployee.noTelepon || '-'}</span>
                </div>
              </div>

              {/* Atasan Langsung & Bawahan Langsung */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Atasan Langsung
                  </p>
                  {inspectedSupervisor ? (
                    <button
                      type="button"
                      onClick={() => setInspectedEmployee(inspectedSupervisor)}
                      className="w-full p-2.5 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 hover:border-[#0072BC] text-left flex items-center justify-between gap-2 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#173B65] dark:text-slate-100 truncate">
                          {inspectedSupervisor.fullName}
                        </p>
                        <p className="text-[10px] text-[#0072BC] dark:text-[#72C8F1] truncate">
                          {inspectedSupervisor.jabatanLengkap}
                        </p>
                      </div>
                      <ArrowUpRight size={14} className="text-[#0072BC] dark:text-[#72C8F1] shrink-0" />
                    </button>
                  ) : inspectedEmployee.atasanNama ? (
                    <div className="p-2.5 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 text-xs">
                      <p className="font-bold text-[#173B65] dark:text-slate-100">
                        {inspectedEmployee.atasanNama}
                      </p>
                      {inspectedEmployee.atasanJabatan && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          {inspectedEmployee.atasanJabatan}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">Pimpinan Tertinggi / Tidak Ada Atasan</p>
                  )}
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Bawahan Langsung ({inspectedSubordinates.length})
                  </p>
                  {inspectedSubordinates.length > 0 ? (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {inspectedSubordinates.map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => setInspectedEmployee(sub)}
                          className="w-full p-2 rounded-lg bg-[#F4F8FB] dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700 hover:border-[#0072BC] text-left flex items-center justify-between gap-2 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#173B65] dark:text-slate-100 truncate">
                              {sub.fullName}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {sub.jabatanLengkap}
                            </p>
                          </div>
                          <ChevronRight size={13} className="text-slate-400 shrink-0" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">Belum ada bawahan langsung terdaftar.</p>
                  )}
                </div>
              </div>

              {onSelectEmployee && (
                <button
                  type="button"
                  onClick={() => {
                    const target = inspectedEmployee;
                    setInspectedEmployee(null);
                    onSelectEmployee(target);
                  }}
                  className="w-full py-2.5 bg-[#0072BC] text-white rounded-xl text-xs font-bold hover:bg-[#173B65] transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink size={14} />
                  Buka Profil Lengkap Pegawai
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OrgStructure;
