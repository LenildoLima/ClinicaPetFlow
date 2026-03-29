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
import { Plus, Search, DollarSign, Wallet, ArrowUpCircle, ArrowDownCircle, Clock, Calendar, Lock, Unlock, Trash2, History, Receipt } from 'lucide-react';
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

  const fetchCaixa = async () => {
    setLoading(true);
    const hoje = new Date().toISOString().split('T')[0];
    
    // Verificar se tem caixa aberto hoje
    const { data: caixa } = await supabase
      .from('caixa')
      .select('*, usuarios!aberto_por(nome)')
      .eq('data', hoje)
      .eq('status', 'aberto')
      .maybeSingle();

    setCaixaAtivo(caixa);

    if (caixa) {
      // Buscar movimentações
      const { data: movs } = await supabase
        .from('caixa_movimentacoes')
        .select('*, usuarios!registrado_por(nome)')
        .eq('caixa_id', caixa.id)
        .order('criado_em', { ascending: false });
      setMovimentacoes(movs || []);

      // Buscar consultas do dia para vínculo
      const { data: cons } = await supabase
        .from('consultas')
        .select(`
          id, data_hora, tipo,
          pets ( nome ),
          tutores ( nome )
        `)
        .gte('data_hora', `${hoje}T00:00:00-03:00`)
        .lte('data_hora', `${hoje}T23:59:59-03:00`)
        .in('status', ['concluido', 'agendado', 'confirmado'])
        .order('data_hora', { ascending: true });
      setConsultasDia(cons || []);
    }

    // Buscar histórico
    const { data: hist } = await supabase
      .from('caixa')
      .select('*, aberto:usuarios!aberto_por(nome), fechado:usuarios!fechado_por(nome)')
      .order('data', { ascending: false })
      .limit(20);
    setHistoricoCaixas(hist || []);

    setLoading(false);
  };

  useEffect(() => {
    fetchCaixa();
  }, []);

  const handleAbrirCaixa = async () => {
    if (!saldoInicialInput) return;
    const hoje = new Date().toISOString().split('T')[0];
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
      fetchCaixa();
    }
  };

  const handleFecharCaixa = async () => {
    if (!caixaAtivo) return;
    
    const entradas = movimentacoes.filter(m => m.tipo === 'entrada').reduce((sum, m) => sum + Number(m.valor), 0);
    const saidas = movimentacoes.filter(m => m.tipo === 'saida').reduce((sum, m) => sum + Number(m.valor), 0);
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
                        <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground italic">Nenhuma movimentação registrada hoje.</TableCell></TableRow>
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
            <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-xl border border-dashed border-muted-foreground/30">
              <Lock className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
              <h2 className="text-xl font-bold text-muted-foreground">O caixa está fechado</h2>
              <p className="text-muted-foreground mb-6">Abra o caixa para começar a registrar movimentações.</p>
              <Button onClick={() => setIsAbrirOpen(true)} size="lg" className="gap-2"><Unlock className="h-4 w-4" /> Abrir Caixa Agora</Button>
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
                        <TableCell className="text-green-600">+{formatCurrency(h.total_entradas || 0)}</TableCell>
                        <TableCell className="text-red-600">-{formatCurrency(h.total_saidas || 0)}</TableCell>
                        <TableCell className="font-bold">{formatCurrency(h.saldo_final || 0)}</TableCell>
                        <TableCell>
                           <Badge variant="outline" className={h.status === 'aberto' ? 'bg-green-50 text-green-700' : 'bg-slate-50 text-slate-700'}>
                             {h.status.toUpperCase()}
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
        <DialogContent>
          <DialogHeader><DialogTitle>Abrir Caixa</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Saldo Inicial em Dinheiro (R$)</Label>
              <Input type="number" step="0.01" placeholder="0,00" value={saldoInicialInput} onChange={e => setSaldoInicialInput(e.target.value)} />
              <p className="text-xs text-muted-foreground italic">Informe o valor presente na gaveta no início do dia.</p>
            </div>
            <Button onClick={handleAbrirCaixa} className="w-full">Abrir Caixa</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEntradaOpen} onOpenChange={setIsEntradaOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Entrada</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
               <Label>Descrição</Label>
               <Input placeholder="Ex: Pagamento Banho, Venda de Ração" value={novaMovimentacao.descricao} onChange={e => setNovaMovimentacao({...novaMovimentacao, descricao: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label>Valor (R$)</Label>
                 <Input type="number" step="0.01" placeholder="0,00" value={novaMovimentacao.valor} onChange={e => setNovaMovimentacao({...novaMovimentacao, valor: e.target.value})} />
               </div>
               <div className="space-y-2">
                 <Label>Forma de Pagamento</Label>
                 <Select value={novaMovimentacao.forma_pagamento} onValueChange={v => setNovaMovimentacao({...novaMovimentacao, forma_pagamento: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{formasPagamento.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                 </Select>
               </div>
            </div>
            <div className="space-y-2">
               <Label>Vincular Consulta (Opcional)</Label>
               <Select value={novaMovimentacao.consulta_id} onValueChange={v => setNovaMovimentacao({...novaMovimentacao, consulta_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Selecione uma consulta..." /></SelectTrigger>
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
            <Button onClick={() => handleRegistrarMovimentacao('entrada')} className="w-full bg-green-600 hover:bg-green-700">Confirmar Entrada</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSaidaOpen} onOpenChange={setIsSaidaOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-red-600">Registrar Saída</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
               <Label>Descrição</Label>
               <Input placeholder="Ex: Compra de material, Pagamento de luz" value={novaMovimentacao.descricao} onChange={e => setNovaMovimentacao({...novaMovimentacao, descricao: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label>Valor (R$)</Label>
                 <Input type="number" step="0.01" placeholder="0,00" value={novaMovimentacao.valor} onChange={e => setNovaMovimentacao({...novaMovimentacao, valor: e.target.value})} />
               </div>
               <div className="space-y-2">
                 <Label>Categoria</Label>
                 <Select value={novaMovimentacao.categoria} onValueChange={v => setNovaMovimentacao({...novaMovimentacao, categoria: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{categoriasSaida.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                 </Select>
               </div>
            </div>
            <div className="space-y-2">
               <Label>Forma de Pagamento</Label>
               <Select value={novaMovimentacao.forma_pagamento} onValueChange={v => setNovaMovimentacao({...novaMovimentacao, forma_pagamento: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{formasPagamento.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
               </Select>
            </div>
            <Button onClick={() => handleRegistrarMovimentacao('saida')} variant="destructive" className="w-full">Confirmar Saída</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isFecharOpen} onOpenChange={setIsFecharOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Fechar Caixa</DialogTitle></DialogHeader>
          {caixaAtivo && (
            <div className="space-y-6 py-4">
              <div className="space-y-2 divide-y border rounded-lg p-4 bg-muted/20">
                <div className="flex justify-between py-1 text-sm"><span>Saldo Inicial:</span><span>{formatCurrency(caixaAtivo.saldo_inicial)}</span></div>
                <div className="flex justify-between py-1 text-sm text-green-600"><span>(+) Total Entradas:</span><span>{formatCurrency(totalEntradas)}</span></div>
                <div className="flex justify-between py-1 text-sm text-red-600"><span>(-) Total Saídas:</span><span>{formatCurrency(totalSaidas)}</span></div>
                <div className="flex justify-between py-2 text-xl font-bold border-t mt-2"><span>Saldo Final:</span><span className="text-primary">{formatCurrency(saldoAtual)}</span></div>
              </div>
              <p className="text-sm text-center text-muted-foreground px-4">Ao fechar o caixa, você não poderá mais registrar movimentações para esta data.</p>
              <Button onClick={handleFecharCaixa} variant="destructive" className="w-full h-12 text-lg">Confirmar Fechamento</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
