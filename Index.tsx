import { useState, useMemo, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { processData, normalizeText, calcularGradesOcupadas } from '@/lib/stockUtils';
import type { StockItem } from '@/lib/stockUtils';
import { exportarResumoPilhas, exportarListaQuebras, exportarDataCurta, exportarRelatorioTransferencia } from '@/lib/exportUtils';
import KpiCards from '@/components/KpiCards';
import StockCharts from '@/components/StockCharts';
import StockTable from '@/components/StockTable';
import FilterPanel from '@/components/FilterPanel';

export default function Index() {
  const [db, setDb] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Filters
  const [quickFilter, setQuickFilter] = useState('TODOS');
  const [search, setSearch] = useState('');
  const [marca, setMarca] = useState('TODOS');
  const [operacao, setOperacao] = useState('TODOS');
  const [tipo, setTipo] = useState('TODOS');
  const [validade, setValidade] = useState('TODOS');
  const [sortBy, setSortBy] = useState('validadeAsc');
  const [groupBy, setGroupBy] = useState('ETIQUETA');

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(new Uint8Array(evt.target!.result as ArrayBuffer), { type: 'array', cellDates: true });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
      setDb(processData(rows as Record<string, unknown>[]));
      setLoading(false);
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const filtered = useMemo(() => {
    const s = normalizeText(search);
    let result = db.filter(item => {
      if (s && !normalizeText(`${item.produto} ${item.cod}`).includes(s)) return false;
      if (marca !== 'TODOS' && item.marca !== marca) return false;
      if (operacao !== 'TODOS' && item.operacao !== operacao) return false;
      if (tipo !== 'TODOS' && item.tipo !== tipo) return false;
      if (validade !== 'TODOS' && item.validadeStatus !== validade) return false;
      if (quickFilter === 'DATA_CURTA') return item.isDataCurta;
      if (quickFilter === 'PILHA') return item.tipo === 'PILHA';
      if (quickFilter === 'QUEBRA') return item.tipo === 'QUEBRA';
      return true;
    });
    return result;
  }, [db, search, marca, operacao, tipo, validade, quickFilter]);

  const tableData = useMemo(() => {
    let data = filtered;
    if (groupBy === 'DATA') {
      const grouped: Record<string, StockItem> = {};
      filtered.forEach(i => {
        const key = i.cod + '_' + i.diff;
        if (!grouped[key]) grouped[key] = { ...i, qtd: 0, gradesOcupadas: 0 };
        grouped[key].qtd += i.qtd;
      });
      data = Object.values(grouped).map(item => ({
        ...item,
        gradesOcupadas: calcularGradesOcupadas(item)
      }));
    }
    const sorted = [...data];
    sorted.sort((a, b) => {
      if (sortBy === 'validadeDesc') return b.diff - a.diff;
      if (sortBy === 'qtdDesc') return b.qtd - a.qtd;
      if (sortBy === 'gradesDesc') return b.gradesOcupadas - a.gradesOcupadas;
      return a.diff - b.diff;
    });
    return sorted;
  }, [filtered, groupBy, sortBy]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center flex-col z-[200]" style={{ background: 'rgba(242,242,247,0.55)', backdropFilter: 'blur(32px)' }}>
        <div className="w-9 h-9 border-[2.5px] rounded-full animate-spin mb-4" style={{ borderColor: 'rgba(0,0,0,0.08)', borderTopColor: '#1C1C1E' }} />
        <p className="text-xs font-semibold" style={{ color: '#8E8E93' }}>Sincronizando dados…</p>
      </div>
    );
  }

  return (
    <>
      <input type="file" ref={fileRef} accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFile} />
      
      {/* NAV */}
      <nav className="nav-bar px-8 py-3.5 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-5">
          <span className="font-black text-[1.15rem] tracking-tighter" style={{ color: '#1C1C1E' }}>PANUTRIR</span>
          <div className="h-5 w-px bg-foreground/10 mx-1" />
          <div>
            <h1 className="text-[11px] font-black tracking-tight leading-tight" style={{ color: '#1C1C1E' }}>Gestão de Estoque</h1>
            <p className="text-[9px] font-semibold tracking-wide uppercase" style={{ color: '#AEAEB2' }}>CD Matriz Panutrir</p>
          </div>
        </div>
      </nav>

      {db.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[85vh] text-center px-4">
          <h2 className="text-[2rem] font-black tracking-tighter leading-none mb-3" style={{ color: '#1C1C1E' }}>Aguardando base de dados Inflow.</h2>
          <p className="text-sm max-w-xs font-medium leading-relaxed" style={{ color: '#AEAEB2' }}>
            Importe o relatório de etiquetas gerado pelo sistema Inflow para começar.
          </p>
          <div className="mt-10">
            <button onClick={() => fileRef.current?.click()} className="upload-btn">Importar Dados</button>
          </div>
        </div>
      ) : (
        <main className="px-8 pt-8 pb-16 max-w-[1760px] mx-auto">
          <KpiCards data={filtered} />
          <StockCharts data={filtered} />
          <FilterPanel
            quickFilter={quickFilter} setQuickFilter={setQuickFilter}
            search={search} setSearch={setSearch}
            marca={marca} setMarca={setMarca}
            operacao={operacao} setOperacao={setOperacao}
            tipo={tipo} setTipo={setTipo}
            validade={validade} setValidade={setValidade}
            sortBy={sortBy} setSortBy={setSortBy}
            groupBy={groupBy} setGroupBy={setGroupBy}
            onExportDataCurta={() => exportarDataCurta(db)}
            onExportPilhas={() => exportarResumoPilhas(db)}
            onExportQuebras={() => exportarListaQuebras(db)}
            onExportRelatorio={() => exportarRelatorioTransferencia(db)}
          />
          <StockTable data={tableData} />
        </main>
      )}
    </>
  );
}
