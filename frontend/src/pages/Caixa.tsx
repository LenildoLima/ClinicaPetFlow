import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, DollarSign, Wallet, ArrowUpCircle, ArrowDownCircle, Clock, Calendar, Lock, Unlock, Trash2, History, Receipt, AlertTriangle } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from '@/components/EmptyState';
import { format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';

interface CaixaAtivo {
  id: string;
  data: string;
  status: 'aberto' | 'fechado';
  saldo_inicial: number;
  aberto_por: string;
  usuarios?: { nome: string };
  criado_em: string;
}

interface Movimentacao {
  id: string;
  caixa_id: string;
  tipo: 'entrada' | 'saida';
  descricao: string;
  valor: number;
  forma_pagamento: string;
  registrado_por: string;
  usuarios?: { nome: string };
  criado_em: string;
}

const categoriasSaida = [
  { value: 'material', label: 'Material' },
  { value: 'medicamento', label: 'Medicamento' },
  { value: 'conta', label: 'Conta (Água/Luz/etc)' },
  { value: 'salario', label: 'Salário' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'outro', label: 'Outro' },
];

const formasPagamento = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'Pix' },
  { value: 'cartao_debito', label: 'Cartão Débito' },
  { value: 'cartao_credito', label: 'Cartão Crédito' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'outro', label: 'Outro' },
];

const getFormaPagamentoLabel = (value: string) => {
  return formasPagamento.find(o => o.value === value)?.label || value;
};

const getCategoriaLabel = (value: string) => {
  return categoriasSaida.find(o => o.value === value)?.label || value;
};

export default function Caixa() {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const hoje = new Date().toLocaleDateString('en-CA', { 
    timeZone: 'America/Sao_Paulo' 
  });
  const [caixaAtivo, setCaixaAtivo] = useState<CaixaAtivo | null>(null);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [historicoCaixas, setHistoricoCaixas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modais
  const [isAbrirOpen, setIsAbrirOpen] = useState(false);
  const [isEntradaOpen, setIsEntradaOpen] = useState(false);
  const [isSaidaOpen, setIsSaidaOpen] = useState(false);
  const [isFecharOpen, setIsFecharOpen] = useState(false);

  // Forms
  const [saldoInicialInput, setSaldoInicialInput] = useState('');
  const [novaMovimentacao, setNovaMovimentacao] = useState({
    descricao: '',
    valor: '',
    forma_pagamento: 'dinheiro',
    categoria: 'outro',
    observacoes: '',
    consulta_id: ''
  });

  const [consultasDia, setConsultasDia] = useState<any[]>([]);
  const [mensagemSaldo, setMensagemSaldo] = useState('');
  const [vendasAvulsas, setVendasAvulsas] = useState<any[]>([]);
  const [vendaAvulsaVinculada, setVendaAvulsaVinculada] = useState<string>('none');

  const fetchCaixa = async () => {
    setLoading(true);
    
    // Buscar qualquer caixa aberto (independente da data)
    const { data: caixaAberto } = await supabase
      .from('caixa')
      .select('*, usuarios!aberto_por(nome)')
      .eq('status', 'aberto')
      .order('data', { ascending: false })
      .limit(1)
      .maybeSingle();

    setCaixaAtivo(caixaAberto);

    if (caixaAberto) {
      // Buscar movimentações
      const { data: movs } = await supabase
        .from('caixa_movimentacoes')
        .select('*, usuarios!registrado_por(nome)')
        .eq('caixa_id', caixaAberto.id)
        .order('criado_em', { ascending: false });
      setMovimentacoes(movs || []);

      // Buscar consultas do dia do caixa para vínculo
      const dataCaixa = caixaAberto.data;
      const { data: cons } = await supabase
        .from('consultas')
        .select(`
          id, data_hora, tipo,
          pets ( nome ),
          tutores ( nome )
        `)
        .gte('data_hora', `${dataCaixa}T00:00:00-03:00`)
        .lte('data_hora', `${dataCaixa}T23:59:59-03:00`)
        .in('status', ['concluido', 'agendado', 'confirmado'])
        .order('data_hora', { ascending: true });
      setConsultasDia(cons || []);

      const { data: vendas } = await supabase
        .from('financeiro')
        .select('id, descricao, valor_final, forma_pagamento, tutores(nome)')
        .eq('status', 'pago')
        .is('consulta_id', null)
        .gte('data_pagamento', hoje)
        .order('criado_em', { ascending: false });
      setVendasAvulsas(vendas || []);
    }

    // Buscar histórico
    const { data: hist } = await supabase
      .from('caixa')
      .select('*, aberto:usuarios!aberto_por(nome), fechado:usuarios!fechado_por(nome)')
      .order('data', { ascending: false })
      .limit(20);

    const historicoCompleto = await Promise.all(
      (hist || []).map(async (caixa) => {
        if (caixa.status === 'aberto') {
          const { data: movs } = await supabase
            .from('caixa_movimentacoes')
            .select('tipo, valor')
            .eq('caixa_id', caixa.id);

          const totalEntradas = movs
            ?.filter(m => m.tipo === 'entrada')
            .reduce((acc, m) => acc + Number(m.valor), 0) || 0;

          const totalSaidas = movs
            ?.filter(m => m.tipo === 'saida')
            .reduce((acc, m) => acc + Number(m.valor), 0) || 0;

          const saldoAtual = Number(caixa.saldo_inicial) + totalEntradas - totalSaidas;

          return {
            ...caixa,
            total_entradas: totalEntradas,
            total_saidas: totalSaidas,
            saldo_final: saldoAtual,
            parcial: true
          };
        }
        return { ...caixa, parcial: false };
      })
    );

    setHistoricoCaixas(historicoCompleto);

    setLoading(false);
  };

  const buscarSaldoAnterior = async () => {
    const { data: ultimoCaixa } = await supabase
      .from('caixa')
      .select('saldo_final, data')
      .eq('status', 'fechado')
      .order('data', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ultimoCaixa) {
      setSaldoInicialInput(String(ultimoCaixa.saldo_final || 0));
      setMensagemSaldo(`Saldo do dia ${format(new Date(ultimoCaixa.data + 'T00:00:00'), 'dd/MM/yyyy')}: R$ ${ultimoCaixa.saldo_final?.toFixed(2)}`);
    } else {
      setSaldoInicialInput('0.00');
      setMensagemSaldo('');
    }
  };

  useEffect(() => {
    if (isAbrirOpen) {
      buscarSaldoAnterior();
    }
  }, [isAbrirOpen]);

  useEffect(() => {
    fetchCaixa();
  }, []);

  const handleAbrirCaixa = async () => {
    if (!saldoInicialInput) return;
    const { error } = await supabase
      .from('caixa')
      .insert({
        data: hoje,
        status: 'aberto',
        aberto_por: user?.id,
        saldo_inicial: Number(saldoInicialInput)
      });

    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Caixa aberto com sucesso!' });
      setIsAbrirOpen(false);
      fetchCaixa();
    }
  };

  const handleRegistrarMovimentacao = async (tipo: 'entrada' | 'saida') => {
    if (!caixaAtivo || !novaMovimentacao.descricao || !novaMovimentacao.valor) return;

    const descricaoFinal = tipo === 'saida' && novaMovimentacao.categoria !== 'outro'
      ? `[${getCategoriaLabel(novaMovimentacao.categoria)}] ${novaMovimentacao.descricao}`
      : novaMovimentacao.descricao;

    const { error } = await supabase
      .from('caixa_movimentacoes')
      .insert({
        caixa_id: caixaAtivo.id,
        tipo,
        descricao: descricaoFinal,
        valor: Number(novaMovimentacao.valor),
        forma_pagamento: novaMovimentacao.forma_pagamento,
        consulta_id: novaMovimentacao.consulta_id || null,
        registrado_por: user?.id
      });

    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else {
      toast({ title: `${tipo === 'entrada' ? 'Entrada' : 'Saída'} registrada!` });
      setIsEntradaOpen(false);
      setIsSaidaOpen(false);
      setNovaMovimentacao({ descricao: '', valor: '', forma_pagamento: 'dinheiro', categoria: 'outro', observacoes: '', consulta_id: '' });
      setVendaAvulsaVinculada('none');
      fetchCaixa();
    }
  };

  const handleFecharCaixa = async () => {
    if (!caixaAtivo) return;
    
    // Garantir que temos as movimentações mais recentes do banco
    const { data: movsAtualizadas } = await supabase
      .from('caixa_movimentacoes')
      .select('tipo, valor')
      .eq('caixa_id', caixaAtivo.id);

    const checkMovs = movsAtualizadas || movimentacoes;
    
    const entradas = checkMovs.filter(m => m.tipo === 'entrada').reduce((sum, m) => sum + Number(m.valor), 0);
    const saidas = checkMovs.filter(m => m.tipo === 'saida').reduce((sum, m) => sum + Number(m.valor), 0);
    const saldoFinal = Number(caixaAtivo.saldo_inicial) + entradas - saidas;

    const { error } = await supabase
      .from('caixa')
      .update({
        status: 'fechado',
        fechado_por: user?.id,
        total_entradas: entradas,
        total_saidas: saidas,
        saldo_final: saldoFinal
      })
      .eq('id', caixaAtivo.id);

    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Caixa fechado com sucesso!' });
      setIsFecharOpen(false);
      fetchCaixa();
    }
  };

  const handleDeleteMovimentacao = async (id: string) => {
    if (!confirm('Excluir esta movimentação?')) return;
    const { error } = await supabase.from('caixa_movimentacoes').delete().eq('id', id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Movimentação excluída' }); fetchCaixa(); }
  };

  const handleSelecionarVendaAvulsa = async (financeiroId: string) => {
    setVendaAvulsaVinculada(financeiroId);
    
    if (financeiroId && financeiroId !== 'none') {
      const { data } = await supabase
        .from('financeiro')
        .select('valor_final, descricao, forma_pagamento, tutores(nome)')
        .eq('id', financeiroId)
        .single();
      
      if (data) {
        setNovaMovimentacao(prev => ({
          ...prev,
          valor: String(data.valor_final),
          descricao: data.descricao || prev.descricao,
          forma_pagamento: data.forma_pagamento || prev.forma_pagamento
        }));
      }
    }
  };

  const handleSelecionarConsulta = async (consultaId: string) => {
    if (consultaId === 'none' || !consultaId) {
      setNovaMovimentacao(prev => ({ ...prev, consulta_id: '' }));
      return;
    }

    setNovaMovimentacao(prev => ({ ...prev, consulta_id: consultaId }));

    // Buscar dados no financeiro
    const { data: financeiro, error } = await supabase
      .from('financeiro')
      .select('valor_final, descricao, status, forma_pagamento')
      .eq('consulta_id', consultaId)
      .in('status', ['pendente', 'pago'])
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar financeiro:', error);
      return;
    }

    if (financeiro) {
      setNovaMovimentacao(prev => ({
        ...prev,
        valor: String(financeiro.valor_final),
        descricao: financeiro.descricao || prev.descricao || 'Atendimento',
        forma_pagamento: financeiro.forma_pagamento || prev.forma_pagamento
      }));
      toast({ 
        title: 'Dados preenchidos!', 
        description: `Cobrança de R$ ${financeiro.valor_final.toFixed(2)} (${financeiro.forma_pagamento})` 
      });
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const totalEntradas = movimentacoes.filter(m => m.tipo === 'entrada').reduce((sum, m) => sum + Number(m.valor), 0);
  const totalSaidas = movimentacoes.filter(m => m.tipo === 'saida').reduce((sum, m) => sum + Number(m.valor), 0);
  const saldoAtual = (caixaAtivo?.saldo_inicial || 0) + totalEntradas - totalSaidas;

  if (userData?.cargo === 'veterinario') {
    return <div className="p-8 text-center text-destructive font-bold">Acesso negado. Restrito a Admin e Recepcionista.</div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Controle de Caixa</h1>
          <p className="text-muted-foreground text-sm">Gerencie o fluxo financeiro diário da clínica.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-muted/30 p-2 rounded-lg border">
          <div className="flex items-center gap-2 px-3 border-r">
            <Badge className={caixaAtivo ? 'bg-green-500' : 'bg-red-500'}>
              {caixaAtivo ? 'ABERTO' : 'FECHADO'}
            </Badge>
          </div>
          {caixaAtivo ? (
            <div className="flex items-center gap-4 text-xs">
              <div>
                <p className="text-muted-foreground font-bold uppercase tracking-tighter">Aberto por</p>
                <p className="font-semibold">{caixaAtivo.usuarios?.nome}</p>
              </div>
              <div>
                <p className="text-muted-foreground font-bold uppercase tracking-tighter">Horário</p>
                <p className="font-semibold">{format(new Date(caixaAtivo.criado_em), 'HH:mm')}</p>
              </div>
              <Button variant="destructive" size="sm" onClick={() => setIsFecharOpen(true)}>Fechar Caixa</Button>
            </div>
          ) : (
            <Button onClick={() => setIsAbrirOpen(true)} className="gap-2"><Unlock className="h-4 w-4" /> Abrir Caixa</Button>
          )}
        </div>
      </div>

      {caixaAtivo && caixaAtivo.data !== hoje && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <p className="text-sm text-amber-700">
            Atenção: O caixa do dia {format(new Date(caixaAtivo.data + 'T00:00:00'), 'dd/MM/yyyy')} ainda está aberto. Feche-o antes de abrir o caixa de hoje.
          </p>
        </div>
      )}

      <Tabs defaultValue="hoje" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="hoje">Movimentações de Hoje</TabsTrigger>
          <TabsTrigger value="historico">Histórico de Caixas</TabsTrigger>
        </TabsList>

        <TabsContent value="hoje" className="space-y-6 pt-4">
          {caixaAtivo ? (
            <>
              {/* Cards de Resumo */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase text-muted-foreground">Saldo Inicial</CardTitle></CardHeader>
                  <CardContent><div className="text-2xl font-bold">{formatCurrency(caixaAtivo.saldo_inicial)}</div></CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500">
                  <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase text-muted-foreground">Entradas</CardTitle></CardHeader>
                  <CardContent><div className="text-2xl font-bold text-green-600">+{formatCurrency(totalEntradas)}</div></CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500">
                  <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase text-muted-foreground">Saídas</CardTitle></CardHeader>
                  <CardContent><div className="text-2xl font-bold text-red-600">-{formatCurrency(totalSaidas)}</div></CardContent>
                </Card>
                <Card className="border-l-4 border-l-purple-500">
                  <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase text-muted-foreground">Saldo Atual</CardTitle></CardHeader>
                  <CardContent><div className="text-2xl font-bold text-purple-700">{formatCurrency(saldoAtual)}</div></CardContent>
                </Card>
              </div>

              {/* Ações */}
              <div className="flex gap-2">
                <Button onClick={() => setIsEntradaOpen(true)} className="bg-green-600 hover:bg-green-700 gap-2"><ArrowUpCircle className="h-4 w-4" /> Registrar Entrada</Button>
                <Button onClick={() => setIsSaidaOpen(true)} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 gap-2"><ArrowDownCircle className="h-4 w-4" /> Registrar Saída</Button>
              </div>

              {/* Tabela */}
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Horário</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Pagamento</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Registrado por</TableHead>
                        {userData?.cargo === 'admin' && <TableHead className="text-right">Ações</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-8">Carregando...</TableCell></TableRow>
                      ) : movimentacoes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="p-0">
                            <EmptyState 
                              icon={History}
                              title="Nenhuma movimentação hoje"
                              description="O fluxo de caixa aparecerá aqui conforme você registrar entradas e saídas."
                              action={
                                <div className="flex gap-2">
                                  <Button onClick={() => setIsEntradaOpen(true)} className="bg-green-600 hover:bg-green-700 gap-2"><ArrowUpCircle className="h-4 w-4" /> Entrada</Button>
                                  <Button onClick={() => setIsSaidaOpen(true)} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 gap-2"><ArrowDownCircle className="h-4 w-4" /> Saída</Button>
                                </div>
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ) : movimentacoes.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="text-xs">{format(new Date(m.criado_em), 'HH:mm')}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={m.tipo === 'entrada' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}>
                              {m.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{m.descricao}</div>
                          </TableCell>
                          <TableCell className="text-xs">{getFormaPagamentoLabel(m.forma_pagamento)}</TableCell>
                          <TableCell className={`font-bold ${m.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                            {m.tipo === 'entrada' ? '+' : '-'}{formatCurrency(m.valor)}
                          </TableCell>
                          <TableCell className="text-xs">{m.usuarios?.nome}</TableCell>
                          {userData?.cargo === 'admin' && (
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDeleteMovimentacao(m.id)}><Trash2 className="h-4 w-4" /></Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="py-12 bg-white rounded-xl border border-slate-100 shadow-sm">
              <EmptyState 
                icon={Lock}
                title="O caixa está fechado"
                description="Abra o caixa para começar a registrar movimentações financeiras de hoje."
                action={
                  <Button onClick={() => setIsAbrirOpen(true)} size="lg" className="gap-2 shadow-lg hover:shadow-xl transition-all"><Unlock className="h-4 w-4" /> Abrir Caixa Agora</Button>
                }
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="historico" className="pt-4">
           <Card>
             <CardContent className="p-0">
               <Table>
                 <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Aberto por</TableHead>
                      <TableHead>Fechado por</TableHead>
                      <TableHead>Saldo Inicial</TableHead>
                      <TableHead>Entradas</TableHead>
                      <TableHead>Saídas</TableHead>
                      <TableHead>Saldo Final</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                 </TableHeader>
                 <TableBody>
                    {historicoCaixas.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell className="font-medium">{format(new Date(h.data + 'T00:00:00'), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="text-xs">{h.aberto?.nome}</TableCell>
                        <TableCell className="text-xs">{h.fechado?.nome || '-'}</TableCell>
                        <TableCell>{formatCurrency(h.saldo_inicial)}</TableCell>
                        <TableCell>
                          <div className="text-green-600">+{formatCurrency(h.total_entradas || 0)}</div>
                          {h.parcial && <div className="text-[10px] text-muted-foreground italic">(parcial)</div>}
                        </TableCell>
                        <TableCell>
                          <div className="text-red-600">-{formatCurrency(h.total_saidas || 0)}</div>
                          {h.parcial && <div className="text-[10px] text-muted-foreground italic">(parcial)</div>}
                        </TableCell>
                        <TableCell>
                          <div className="font-bold">{formatCurrency(h.saldo_final || 0)}</div>
                          {h.parcial && <div className="text-[10px] text-muted-foreground italic">(parcial)</div>}
                        </TableCell>
                        <TableCell>
                           <Badge variant="outline" className={h.status === 'aberto' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-green-50 text-green-700 border-green-200'}>
                             {h.status === 'aberto' ? 'EM ANDAMENTO' : 'FECHADO'}
                           </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                 </TableBody>
               </Table>
             </CardContent>
           </Card>
        </TabsContent>
      </Tabs>

      {/* Modais */}
      <Dialog open={isAbrirOpen} onOpenChange={setIsAbrirOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="bg-primary p-6">
            <DialogTitle className="flex items-center gap-2 text-white text-xl">
              <Unlock className="w-6 h-6" />
              Abrir Caixa
            </DialogTitle>
            <p className="text-primary-foreground/80 text-sm mt-1">Inicie o dia informando o saldo inicial do caixa.</p>
          </DialogHeader>
          <div className="max-h-[80vh] overflow-y-auto">
            <div className="p-6 space-y-6 bg-slate-50/50">
              {mensagemSaldo && (
                <div className="p-4 bg-blue-50 text-blue-700 rounded-xl text-sm border border-blue-100 flex items-center gap-3">
                  <DollarSign className="h-5 w-5 shrink-0" />
                  <span className="font-medium">{mensagemSaldo}</span>
                </div>
              )}
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
                <div className="space-y-1.5 focus-within:text-primary transition-colors">
                  <Label className="font-semibold">Saldo Inicial em Dinheiro (R$)</Label>
                  <Input className="bg-slate-50 text-lg h-12" type="number" step="0.01" placeholder="0,00" value={saldoInicialInput} onChange={e => setSaldoInicialInput(e.target.value)} />
                  <p className="text-xs text-muted-foreground italic">Informe o valor presente na gaveta no início do dia.</p>
                </div>
              </div>
              <div className="pt-2">
                <Button onClick={handleAbrirCaixa} className="w-full text-lg h-12 rounded-xl shadow-md hover:shadow-lg transition-all">Confirmar Abertura</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEntradaOpen} onOpenChange={setIsEntradaOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="bg-green-600 p-6">
            <DialogTitle className="flex items-center gap-2 text-white text-xl">
              <ArrowUpCircle className="w-6 h-6" />
              Registrar Entrada
            </DialogTitle>
            <p className="text-green-50 text-sm mt-1">Insira os detalhes do valor recebido.</p>
          </DialogHeader>
          <div className="max-h-[80vh] overflow-y-auto">
            <div className="p-6 space-y-6 bg-slate-50/50">
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
                <div className="space-y-1.5 focus-within:text-green-600 transition-colors">
                   <Label className="font-semibold">Descrição</Label>
                   <Input className="bg-slate-50" placeholder="Ex: Pagamento Banho, Venda de Ração" value={novaMovimentacao.descricao} onChange={e => setNovaMovimentacao({...novaMovimentacao, descricao: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5 focus-within:text-green-600 transition-colors">
                     <Label className="font-semibold">Valor (R$)</Label>
                     <Input className="bg-slate-50" type="number" step="0.01" placeholder="0,00" value={novaMovimentacao.valor} onChange={e => setNovaMovimentacao({...novaMovimentacao, valor: e.target.value})} />
                   </div>
                   <div className="space-y-1.5 focus-within:text-green-600 transition-colors">
                     <Label className="font-semibold">Forma de Pagamento</Label>
                     <Select value={novaMovimentacao.forma_pagamento} onValueChange={v => setNovaMovimentacao({...novaMovimentacao, forma_pagamento: v})}>
                        <SelectTrigger className="bg-slate-50"><SelectValue /></SelectTrigger>
                        <SelectContent>{formasPagamento.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                     </Select>
                   </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
                <h3 className="font-semibold text-green-600 mb-2 text-sm uppercase tracking-wider">Vínculos Opcionais</h3>
                <div className="space-y-1.5 focus-within:text-green-600 transition-colors">
                   <Label className="font-semibold">Vincular Consulta</Label>
                   <Select value={novaMovimentacao.consulta_id || 'none'} onValueChange={handleSelecionarConsulta}>
                      <SelectTrigger className="bg-slate-50"><SelectValue placeholder="Selecione uma consulta..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma consulta</SelectItem>
                        {consultasDia.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            {format(new Date(c.data_hora), 'HH:mm')} - {c.pets?.nome} ({c.tutores?.nome})
                          </SelectItem>
                        ))}
                      </SelectContent>
                   </Select>
                </div>
                <div className="space-y-1.5 focus-within:text-green-600 transition-colors">
                  <Label className="font-semibold">Vincular Venda Avulsa</Label>
                  <Select 
                    value={vendaAvulsaVinculada} 
                    onValueChange={handleSelecionarVendaAvulsa}
                  >
                    <SelectTrigger className="bg-slate-50">
                      <SelectValue placeholder="Nenhuma venda avulsa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma venda avulsa</SelectItem>
                      {vendasAvulsas?.map(v => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.descricao} — R$ {v.valor_final?.toFixed(2)} ({v.tutores?.nome || 'Sem tutor'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="pt-2">
                <Button onClick={() => handleRegistrarMovimentacao('entrada')} className="w-full text-lg h-12 rounded-xl shadow-md hover:shadow-lg transition-all bg-green-600 hover:bg-green-700 text-white">Confirmar Entrada</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSaidaOpen} onOpenChange={setIsSaidaOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="bg-red-600 p-6">
            <DialogTitle className="flex items-center gap-2 text-white text-xl">
              <ArrowDownCircle className="w-6 h-6" />
              Registrar Saída
            </DialogTitle>
            <p className="text-red-50 text-sm mt-1">Registre despesas e retiradas do caixa.</p>
          </DialogHeader>
          <div className="max-h-[80vh] overflow-y-auto">
            <div className="p-6 space-y-6 bg-slate-50/50">
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
                <div className="space-y-1.5 focus-within:text-red-600 transition-colors">
                   <Label className="font-semibold">Descrição</Label>
                   <Input className="bg-slate-50" placeholder="Ex: Compra de material, Pagamento de luz" value={novaMovimentacao.descricao} onChange={e => setNovaMovimentacao({...novaMovimentacao, descricao: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5 focus-within:text-red-600 transition-colors">
                     <Label className="font-semibold">Valor (R$)</Label>
                     <Input className="bg-slate-50" type="number" step="0.01" placeholder="0,00" value={novaMovimentacao.valor} onChange={e => setNovaMovimentacao({...novaMovimentacao, valor: e.target.value})} />
                   </div>
                   <div className="space-y-1.5 focus-within:text-red-600 transition-colors">
                     <Label className="font-semibold">Categoria</Label>
                     <Select value={novaMovimentacao.categoria} onValueChange={v => setNovaMovimentacao({...novaMovimentacao, categoria: v})}>
                        <SelectTrigger className="bg-slate-50"><SelectValue /></SelectTrigger>
                        <SelectContent>{categoriasSaida.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                     </Select>
                   </div>
                </div>
                <div className="space-y-1.5 focus-within:text-red-600 transition-colors">
                   <Label className="font-semibold">Forma de Pagamento</Label>
                   <Select value={novaMovimentacao.forma_pagamento} onValueChange={v => setNovaMovimentacao({...novaMovimentacao, forma_pagamento: v})}>
                      <SelectTrigger className="bg-slate-50"><SelectValue /></SelectTrigger>
                      <SelectContent>{formasPagamento.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                   </Select>
                </div>
              </div>
              <div className="pt-2">
                <Button onClick={() => handleRegistrarMovimentacao('saida')} variant="destructive" className="w-full text-lg h-12 rounded-xl shadow-md hover:shadow-lg transition-all hover:bg-red-700">Confirmar Saída</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isFecharOpen} onOpenChange={setIsFecharOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="bg-slate-800 p-6">
            <DialogTitle className="flex items-center gap-2 text-white text-xl">
              <Lock className="w-6 h-6 text-red-400" />
              Fechar Caixa
            </DialogTitle>
            <p className="text-slate-300 text-sm mt-1">Confira os valores finais antes do fechamento definitivo.</p>
          </DialogHeader>
          {caixaAtivo ? (
            <div className="max-h-[80vh] overflow-y-auto">
              <div className="p-6 space-y-6 bg-slate-50/50">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="space-y-3 divide-y">
                    <div className="flex justify-between py-2 text-sm font-medium text-slate-600"><span>Saldo Inicial:</span><span className="font-bold text-slate-900">{formatCurrency(caixaAtivo.saldo_inicial)}</span></div>
                    <div className="flex justify-between py-2 text-sm text-green-600 font-medium"><span>(+) Total Entradas:</span><span className="font-bold">{formatCurrency(totalEntradas)}</span></div>
                    <div className="flex justify-between py-2 text-sm text-red-600 font-medium"><span>(-) Total Saídas:</span><span className="font-bold">{formatCurrency(totalSaidas)}</span></div>
                    <div className="flex justify-between py-3 text-xl font-bold mt-2 bg-slate-50 -mx-5 px-5 rounded-b-xl border-t"><span>Saldo Final na Gaveta:</span><span className="text-primary">{formatCurrency(saldoAtual)}</span></div>
                  </div>
                </div>
                <p className="text-sm text-center text-slate-500 px-4">Ao fechar o caixa, você não poderá mais registrar movimentações para a data de hoje.</p>
                <div className="pt-2">
                  <Button onClick={handleFecharCaixa} variant="destructive" className="w-full text-lg h-12 rounded-xl shadow-md hover:shadow-lg transition-all hover:bg-red-700">Confirmar Fechamento</Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-500">O caixa atual não pôde ser carregado.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
