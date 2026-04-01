import { useState } from 'react';
import jsPDF from 'jspdf';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Calendar, Package, Stethoscope, FileBarChart, Loader2 } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

const now = new Date();

function pdfHeader(doc: jsPDF, titulo: string, subtitulo: string) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(22, 163, 74);
  doc.rect(0, 0, w, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('PetFlow — Clínica Veterinária', w / 2, 16, { align: 'center' });
  doc.setFontSize(12);
  doc.text(titulo + (subtitulo ? ` — ${subtitulo}` : ''), w / 2, 30, { align: 'center' });
  doc.setTextColor(130, 130, 130);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    `Gerado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
    w - 14, 48, { align: 'right' }
  );
}

function pdfFooter(doc: jsPDF) {
  const total = (doc.internal as any).pages.length - 1;
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setTextColor(180, 180, 180);
    doc.setFontSize(8);
    doc.text(`PetFlow — Página ${i} de ${total}`, w / 2, h - 8, { align: 'center' });
  }
}

function tableHeader(doc: jsPDF, y: number, cols: { label: string; x: number }[], pageWidth: number) {
  doc.setFillColor(240, 240, 240);
  doc.rect(14, y - 5, pageWidth - 28, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  cols.forEach(c => doc.text(c.label, c.x, y));
  return y + 6;
}

function tableRow(doc: jsPDF, y: number, cols: { text: string; x: number; color?: [number,number,number] }[], pageWidth: number, idx: number) {
  if (idx % 2 === 0) {
    doc.setFillColor(249, 250, 251);
    doc.rect(14, y - 5, pageWidth - 28, 7, 'F');
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  cols.forEach(c => {
    doc.setTextColor(...(c.color || [0, 0, 0]));
    doc.text(c.text, c.x, y);
  });
  return y + 7;
}

function checkPage(doc: jsPDF, y: number): number {
  if (y > 270) {
    doc.addPage();
    return 20;
  }
  return y;
}

// ─────────────────────────────────────────────────────────────
// PDF Generators
// ─────────────────────────────────────────────────────────────

async function gerarRelatorioFinanceiro(mes: number, ano: number, toast: any) {
  const inicioMes = new Date(ano, mes - 1, 1).toISOString();
  const fimMes = new Date(ano, mes, 0, 23, 59, 59).toISOString();
  const nomeMes = MESES[mes - 1];

  const { data: cobrancas, error } = await supabase
    .from('financeiro')
    .select('*, tutores(nome)')
    .gte('criado_em', inicioMes)
    .lte('criado_em', fimMes)
    .order('criado_em', { ascending: true });

  if (error) { toast({ title: 'Erro ao buscar dados', description: error.message, variant: 'destructive' }); return; }

  const totalFaturado = cobrancas?.reduce((a, c) => a + Number(c.valor_final || 0), 0) || 0;
  const totalPago = cobrancas?.filter(c => c.status === 'pago').reduce((a, c) => a + Number(c.valor_final || 0), 0) || 0;
  const totalPendente = cobrancas?.filter(c => c.status === 'pendente').reduce((a, c) => a + Number(c.valor_final || 0), 0) || 0;

  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  pdfHeader(doc, 'Relatório Financeiro', `${nomeMes}/${ano}`);

  // Resumo
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('RESUMO DO MÊS', 14, 58);

  const summary = [
    { label: 'Total Faturado:', value: fmt(totalFaturado), color: [22, 163, 74] as [number,number,number] },
    { label: 'Total Recebido:', value: fmt(totalPago), color: [22, 163, 74] as [number, number, number] },
    { label: 'Total Pendente:', value: fmt(totalPendente), color: [202, 138, 4] as [number, number, number] },
    { label: 'Total de Cobranças:', value: String(cobrancas?.length || 0), color: [0, 0, 0] as [number, number, number] },
  ];

  let y = 66;
  summary.forEach(s => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(0, 0, 0);
    doc.text(s.label, 14, y);
    doc.setTextColor(...s.color); doc.setFont('helvetica', 'bold');
    doc.text(s.value, 70, y);
    y += 8;
  });

  doc.setDrawColor(220, 220, 220);
  doc.line(14, y, w - 14, y);
  y += 8;

  // Tabela
  doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text('DETALHAMENTO DAS COBRANÇAS', 14, y); y += 6;

  const cols = [
    { label: 'Data', x: 16 }, { label: 'Tutor', x: 46 },
    { label: 'Descrição', x: 96 }, { label: 'Valor', x: 152 }, { label: 'Status', x: 172 }
  ];
  y = tableHeader(doc, y, cols, w) + 2;

  cobrancas?.forEach((c, i) => {
    y = checkPage(doc, y);
    const data = new Date(c.criado_em).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const statusColor: [number,number,number] = c.status === 'pago' ? [22, 163, 74] : c.status === 'pendente' ? [202, 138, 4] : [239, 68, 68];
    y = tableRow(doc, y, [
      { text: data, x: 16 },
      { text: (c.tutores?.nome || '').substring(0, 22), x: 46 },
      { text: (c.descricao || '').substring(0, 26), x: 96 },
      { text: fmt(Number(c.valor_final || 0)), x: 152 },
      { text: c.status, x: 172, color: statusColor },
    ], w, i);
  });

  pdfFooter(doc);
  doc.save(`relatorio-financeiro-${nomeMes.toLowerCase()}-${ano}.pdf`);
}

async function gerarRelatorioConsultas(dataInicio: string, dataFim: string, toast: any) {
  const { data: consultas, error } = await supabase
    .from('consultas')
    .select('*, pets(nome, especie), tutores(nome), usuarios!veterinario_id(nome)')
    .gte('data_hora', dataInicio)
    .lte('data_hora', dataFim + 'T23:59:59')
    .order('data_hora', { ascending: true });

  if (error) { toast({ title: 'Erro ao buscar dados', description: error.message, variant: 'destructive' }); return; }

  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  const periodo = `${new Date(dataInicio).toLocaleDateString('pt-BR')} a ${new Date(dataFim).toLocaleDateString('pt-BR')}`;
  pdfHeader(doc, 'Relatório de Consultas', periodo);

  // Contagens por tipo
  const porTipo: Record<string, number> = {};
  const porVet: Record<string, number> = {};
  consultas?.forEach(c => {
    porTipo[c.tipo] = (porTipo[c.tipo] || 0) + 1;
    const vetNome = (c as any).usuarios?.nome || 'Sem veterinário';
    porVet[vetNome] = (porVet[vetNome] || 0) + 1;
  });

  let y = 58;
  doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text('RESUMO', 14, y); y += 8;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text(`Total de consultas no período: ${consultas?.length || 0}`, 14, y); y += 7;

  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('Por Tipo:', 14, y); y += 6;
  doc.setFont('helvetica', 'normal');
  Object.entries(porTipo).forEach(([tipo, qtd]) => {
    doc.text(`  ${tipo}: ${qtd}`, 14, y); y += 5;
  });

  y += 3;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('Por Veterinário:', 14, y); y += 6;
  doc.setFont('helvetica', 'normal');
  Object.entries(porVet).forEach(([vet, qtd]) => {
    doc.text(`  ${vet}: ${qtd}`, 14, y); y += 5;
  });

  doc.setDrawColor(220, 220, 220);
  y += 3; doc.line(14, y, w - 14, y); y += 6;

  doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text('LISTA DE CONSULTAS', 14, y); y += 6;

  const cols = [
    { label: 'Data/Hora', x: 16 }, { label: 'Pet', x: 50 },
    { label: 'Tutor', x: 86 }, { label: 'Veterinário', x: 122 },
    { label: 'Tipo', x: 158 }, { label: 'Status', x: 184 }
  ];
  y = tableHeader(doc, y, cols, w) + 2;

  consultas?.forEach((c, i) => {
    y = checkPage(doc, y);
    const data = new Date(c.data_hora).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
    y = tableRow(doc, y, [
      { text: data, x: 16 },
      { text: ((c as any).pets?.nome || '').substring(0, 16), x: 50 },
      { text: ((c as any).tutores?.nome || '').substring(0, 16), x: 86 },
      { text: ((c as any).usuarios?.nome || '').substring(0, 16), x: 122 },
      { text: (c.tipo || '').substring(0, 12), x: 158 },
      { text: c.status || '', x: 184 },
    ], w, i);
  });

  pdfFooter(doc);
  doc.save(`relatorio-consultas-${dataInicio}-${dataFim}.pdf`);
}

async function gerarRelatorioEstoque(toast: any) {
  const [prodRes, movRes] = await Promise.all([
    supabase.from('estoque_produtos').select('*, estoque_categorias(nome)').eq('ativo', true).order('nome'),
    supabase.from('estoque_movimentacoes')
      .select('*, estoque_produtos(nome, unidade)')
      .gte('criado_em', new Date(now.getFullYear(), now.getMonth(), 1).toISOString())
      .order('criado_em', { ascending: false }),
  ]);

  if (prodRes.error) { toast({ title: 'Erro', description: prodRes.error.message, variant: 'destructive' }); return; }

  const produtos = prodRes.data || [];
  const movimentacoes = movRes.data || [];
  const valorTotal = produtos.reduce((a, p) => a + p.preco_custo * p.estoque_atual, 0);
  const abaixoMinimo = produtos.filter(p => p.estoque_atual <= p.estoque_minimo);
  const entradas = movimentacoes.filter(m => m.tipo === 'entrada');
  const saidas = movimentacoes.filter(m => m.tipo === 'saida' || m.tipo === 'venda');

  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  pdfHeader(doc, 'Relatório de Estoque', MESES[now.getMonth()] + '/' + now.getFullYear());

  let y = 58;
  doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text('RESUMO DO ESTOQUE', 14, y); y += 8;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text(`Total de produtos ativos: ${produtos.length}`, 14, y); y += 6;
  doc.text(`Produtos abaixo do mínimo: ${abaixoMinimo.length}`, 14, y); y += 6;
  doc.text(`Entradas no mês: ${entradas.length}`, 14, y); y += 6;
  doc.text(`Saídas no mês: ${saidas.length}`, 14, y); y += 6;
  doc.setFont('helvetica', 'bold'); doc.setTextColor(22, 163, 74);
  doc.text(`Valor total em estoque: ${fmt(valorTotal)}`, 14, y); y += 8;

  if (abaixoMinimo.length > 0) {
    doc.setTextColor(200, 50, 50); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('⚠ PRODUTOS ABAIXO DO MÍNIMO', 14, y); y += 6;
    const cols = [{ label: 'Produto', x: 16 }, { label: 'Atual', x: 120 }, { label: 'Mínimo', x: 148 }, { label: 'Categoria', x: 172 }];
    doc.setTextColor(0, 0, 0);
    y = tableHeader(doc, y, cols, w) + 2;
    abaixoMinimo.forEach((p, i) => {
      y = checkPage(doc, y);
      y = tableRow(doc, y, [
        { text: p.nome.substring(0, 50), x: 16 },
        { text: `${p.estoque_atual} ${p.unidade}`, x: 120, color: [200, 50, 50] },
        { text: `${p.estoque_minimo} ${p.unidade}`, x: 148 },
        { text: (p.estoque_categorias as any)?.nome || '', x: 172 },
      ], w, i);
    });
    y += 4;
  }

  doc.setDrawColor(220, 220, 220);
  doc.line(14, y, w - 14, y); y += 6;

  doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text('LISTA COMPLETA DE PRODUTOS', 14, y); y += 6;
  const colsProd = [{ label: 'Produto', x: 16 }, { label: 'Preço Custo', x: 110 }, { label: 'Preço Venda', x: 142 }, { label: 'Estoque', x: 175 }];
  y = tableHeader(doc, y, colsProd, w) + 2;
  produtos.forEach((p, i) => {
    y = checkPage(doc, y);
    const cor: [number, number, number] = p.estoque_atual <= p.estoque_minimo ? [200, 50, 50] : [0, 0, 0];
    y = tableRow(doc, y, [
      { text: p.nome.substring(0, 50), x: 16 },
      { text: fmt(p.preco_custo), x: 110 },
      { text: fmt(p.preco_venda), x: 142 },
      { text: `${p.estoque_atual} ${p.unidade}`, x: 175, color: cor },
    ], w, i);
  });

  pdfFooter(doc);
  doc.save(`relatorio-estoque-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.pdf`);
}

async function gerarRelatorioVeterinarios(mes: number, ano: number, toast: any) {
  const inicioMes = new Date(ano, mes - 1, 1).toISOString();
  const fimMes = new Date(ano, mes, 0, 23, 59, 59).toISOString();
  const nomeMes = MESES[mes - 1];

  const { data: consultas, error } = await supabase
    .from('consultas')
    .select('*, pets(nome), tutores(nome), usuarios!veterinario_id(nome)')
    .gte('data_hora', inicioMes)
    .lte('data_hora', fimMes)
    .order('data_hora', { ascending: true });

  if (error) { toast({ title: 'Erro ao buscar dados', description: error.message, variant: 'destructive' }); return; }

  // Agrupar por veterinário
  const porVet: Record<string, { total: number; tipos: Record<string, number>; consultas: any[] }> = {};
  consultas?.forEach(c => {
    const vetNome = (c as any).usuarios?.nome || 'Sem veterinário';
    if (!porVet[vetNome]) porVet[vetNome] = { total: 0, tipos: {}, consultas: [] };
    porVet[vetNome].total++;
    porVet[vetNome].tipos[c.tipo] = (porVet[vetNome].tipos[c.tipo] || 0) + 1;
    porVet[vetNome].consultas.push(c);
  });

  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  pdfHeader(doc, 'Atendimentos por Veterinário', `${nomeMes}/${ano}`);

  let y = 58;
  doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text('RESUMO GERAL', 14, y); y += 8;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text(`Total de atendimentos no período: ${consultas?.length || 0}`, 14, y); y += 6;
  doc.text(`Total de veterinários ativos: ${Object.keys(porVet).length}`, 14, y); y += 6;

  doc.setDrawColor(220, 220, 220);
  y += 3; doc.line(14, y, w - 14, y); y += 6;

  // Por cada vet
  Object.entries(porVet).forEach(([vetNome, data]) => {
    y = checkPage(doc, y);
    doc.setFillColor(22, 163, 74);
    doc.rect(14, y - 5, w - 28, 8, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text(`${vetNome} — ${data.total} atendimentos`, 16, y);
    y += 8;

    doc.setTextColor(80, 80, 80); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    Object.entries(data.tipos).forEach(([tipo, qtd]) => {
      doc.text(`  ${tipo}: ${qtd}`, 16, y); y += 5;
    });
    y += 2;

    const cols = [
      { label: 'Data/Hora', x: 16 }, { label: 'Pet', x: 60 },
      { label: 'Tutor', x: 104 }, { label: 'Tipo', x: 148 }, { label: 'Status', x: 178 }
    ];
    doc.setTextColor(0, 0, 0);
    y = tableHeader(doc, y, cols, w) + 2;

    data.consultas.forEach((c, i) => {
      y = checkPage(doc, y);
      const data_hora = new Date(c.data_hora).toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
      });
      y = tableRow(doc, y, [
        { text: data_hora, x: 16 },
        { text: (c.pets?.nome || '').substring(0, 18), x: 60 },
        { text: (c.tutores?.nome || '').substring(0, 18), x: 104 },
        { text: (c.tipo || '').substring(0, 14), x: 148 },
        { text: c.status || '', x: 178 },
      ], w, i);
    });

    y += 8;
  });

  pdfFooter(doc);
  doc.save(`relatorio-veterinarios-${nomeMes.toLowerCase()}-${ano}.pdf`);
}

// ─────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────

interface RelatorioCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  filters?: React.ReactNode;
  onGerar: () => Promise<void>;
  loading: boolean;
}

function RelatorioCard({ icon, title, description, filters, onGerar, loading }: RelatorioCardProps) {
  return (
    <Card className="flex flex-col shadow-sm hover:shadow-md transition-shadow border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="text-sm mt-0.5">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 flex-1">
        {filters && <div className="space-y-3 bg-muted/30 rounded-lg p-3 border">{filters}</div>}
        <div className="mt-auto">
          <Button
            onClick={onGerar}
            disabled={loading}
            className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileBarChart className="h-4 w-4" />}
            {loading ? 'Gerando PDF...' : 'Gerar PDF'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export default function Relatorios() {
  const { toast } = useToast();

  // Financeiro
  const [mesFinanceiro, setMesFinanceiro] = useState(now.getMonth() + 1);
  const [anoFinanceiro, setAnoFinanceiro] = useState(now.getFullYear());
  const [loadingFinanceiro, setLoadingFinanceiro] = useState(false);

  // Consultas
  const [dataInicioConsultas, setDataInicioConsultas] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  );
  const [dataFimConsultas, setDataFimConsultas] = useState(
    new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  );
  const [loadingConsultas, setLoadingConsultas] = useState(false);

  // Estoque
  const [loadingEstoque, setLoadingEstoque] = useState(false);

  // Veterinários
  const [mesVets, setMesVets] = useState(now.getMonth() + 1);
  const [anoVets, setAnoVets] = useState(now.getFullYear());
  const [loadingVets, setLoadingVets] = useState(false);

  const anos = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  const MesAnoFiltro = ({
    mes, setMes, ano, setAno,
  }: { mes: number; setMes: (v: number) => void; ano: number; setAno: (v: number) => void }) => (
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Mês</Label>
        <Select value={String(mes)} onValueChange={v => setMes(Number(v))}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MESES.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Ano</Label>
        <Select value={String(ano)} onValueChange={v => setAno(Number(v))}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {anos.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const run = async (setLoading: (v: boolean) => void, fn: () => Promise<void>) => {
    setLoading(true);
    try { await fn(); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gere relatórios em PDF para análise e arquivo da clínica.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Financeiro */}
        <RelatorioCard
          icon={<DollarSign className="h-6 w-6 text-green-600" />}
          title="Relatório Financeiro do Mês"
          description="Faturamento, pagamentos e pendências do mês selecionado."
          loading={loadingFinanceiro}
          filters={
            <MesAnoFiltro
              mes={mesFinanceiro} setMes={setMesFinanceiro}
              ano={anoFinanceiro} setAno={setAnoFinanceiro}
            />
          }
          onGerar={() => run(setLoadingFinanceiro, () =>
            gerarRelatorioFinanceiro(mesFinanceiro, anoFinanceiro, toast)
          )}
        />

        {/* Consultas */}
        <RelatorioCard
          icon={<Calendar className="h-6 w-6 text-blue-600" />}
          title="Relatório de Consultas"
          description="Consultas realizadas por período, tipo e veterinário."
          loading={loadingConsultas}
          filters={
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Data início</Label>
                <Input
                  type="date" value={dataInicioConsultas}
                  onChange={e => setDataInicioConsultas(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Data fim</Label>
                <Input
                  type="date" value={dataFimConsultas}
                  onChange={e => setDataFimConsultas(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          }
          onGerar={() => run(setLoadingConsultas, () =>
            gerarRelatorioConsultas(dataInicioConsultas, dataFimConsultas, toast)
          )}
        />

        {/* Estoque */}
        <RelatorioCard
          icon={<Package className="h-6 w-6 text-orange-600" />}
          title="Relatório de Estoque"
          description="Produtos abaixo do mínimo, valor total e movimentações do mês."
          loading={loadingEstoque}
          onGerar={() => run(setLoadingEstoque, () => gerarRelatorioEstoque(toast))}
        />

        {/* Veterinários */}
        <RelatorioCard
          icon={<Stethoscope className="h-6 w-6 text-purple-600" />}
          title="Atendimentos por Veterinário"
          description="Produtividade individual de cada veterinário no mês."
          loading={loadingVets}
          filters={
            <MesAnoFiltro
              mes={mesVets} setMes={setMesVets}
              ano={anoVets} setAno={setAnoVets}
            />
          }
          onGerar={() => run(setLoadingVets, () =>
            gerarRelatorioVeterinarios(mesVets, anoVets, toast)
          )}
        />
      </div>
    </div>
  );
}
