import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Filter, DollarSign, Clock, Calendar, CheckCircle2, ChevronDown, Trash2, Eye, Receipt, ArrowRight } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface FinanceiroItem {
  id?: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  obrigatorio?: boolean;
}

interface Cobranca {
  id: string;
  descricao: string;
  valor_total: number;
  desconto: number;
  valor_final: number;
  status: 'rascunho' | 'pendente' | 'pago' | 'cancelado' | 'reembolsado';
  forma_pagamento: string;
  data_vencimento: string;
  data_pagamento: string | null;
  observacoes: string;
  criado_em: string;
  tutores: { nome: string; telefone: string } | null;
  consultas: { data_hora: string; tipo: string } | null;
  financeiro_itens: FinanceiroItem[];
}

const statusColors: Record<string, string> = {
  rascunho: 'bg-slate-100 text-slate-700 border-slate-200',
  pago: 'bg-green-100 text-green-700 border-green-200',
  pendente: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  cancelado: 'bg-red-100 text-red-700 border-red-200',
  reembolsado: 'bg-blue-100 text-blue-700 border-blue-200',
};

const statusLabels: Record<string, string> = {
  rascunho: 'Rascunho',
  pago: 'Pago',
  pendente: 'Pendente',
  cancelado: 'Cancelado',
  reembolsado: 'Reembolsado',
};

const formaPagamentoOptions = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'Pix' },
  { value: 'cartao_debito', label: 'Cartão Débito' },
  { value: 'cartao_credito', label: 'Cartão Crédito' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'outro', label: 'Outro' },
];

const getFormaPagamentoLabel = (value: string) => {
  return formaPagamentoOptions.find(o => o.value === value)?.label || value;
};

export default function Financeiro() {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [searchTutor, setSearchTutor] = useState('');
  const [filterPeriodo, setFilterPeriodo] = useState('este_mes');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterForma, setFilterForma] = useState('todos');
  
  // Modais
  const [isNewCobrancaOpen, setIsNewCobrancaOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [selectedCobranca, setSelectedCobranca] = useState<Cobranca | null>(null);

  // Estados para Nova Cobrança
  const [tutorInput, setTutorInput] = useState('');
  const [tutoresFound, setTutoresFound] = useState<any[]>([]);
  const [selectedTutor, setSelectedTutor] = useState<any>(null);
  const [newCobranca, setNewCobranca] = useState({
    descricao: '',
    desconto: 0,
    forma_pagamento: 'pix',
    status: 'pendente',
    data_vencimento: format(new Date(), 'yyyy-MM-dd'),
    observacoes: '',
    consulta_id: ''
  });
  const [items, setItems] = useState<FinanceiroItem[]>([{ descricao: '', quantidade: 1, valor_unitario: 0, valor_total: 0 }]);
  const [servicos, setServicos] = useState<any[]>([]);
  const [tutorConsultas, setTutorConsultas] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('financeiro')
      .select(`
        *,
        tutores ( nome, telefone ),
        consultas ( id, data_hora, tipo ),
        financeiro_itens (*)
      `)
      .order('criado_em', { ascending: false });

    if (error) {
      toast({ title: 'Erro ao buscar dados', description: error.message, variant: 'destructive' });
    } else {
      setCobrancas(data as unknown as Cobranca[] || []);
    }

    const { data: servs } = await supabase.from('servicos').select('*').order('nome');
    setServicos(servs || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Busca de tutores para nova cobrança
  useEffect(() => {
    if (tutorInput.length < 2) {
      setTutoresFound([]);
      return;
    }
    const search = async () => {
      const { data } = await supabase.from('tutores').select('*').ilike('nome', `%${tutorInput}%`).limit(5);
      setTutoresFound(data || []);
    };
    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [tutorInput]);

  // Busca de consultas do tutor selecionado
  useEffect(() => {
    if (selectedTutor) {
      const fetchConsultas = async () => {
        const { data } = await supabase
          .from('consultas')
          .select('id, data_hora, tipo')
          .eq('tutor_id', selectedTutor.id)
          .order('data_hora', { ascending: false })
          .limit(10);
        setTutorConsultas(data || []);
      };
      fetchConsultas();
    } else {
      setTutorConsultas([]);
    }
  }, [selectedTutor]);

  // Carregar itens do rascunho quando abrir modal de revisão
  useEffect(() => {
    if (selectedCobranca && isReviewOpen) {
      setItems(selectedCobranca.financeiro_itens.map(i => ({ ...i })));
    }
  }, [selectedCobranca, isReviewOpen]);

  const handleAddItem = () => {
    setItems([...items, { descricao: '', quantidade: 1, valor_unitario: 0, valor_total: 0 }]);
  };

  const updateItem = (index: number, field: keyof FinanceiroItem, value: any) => {
    const newItems = [...items];
    const item = newItems[index];
    (item as any)[field] = value;
    if (field === 'quantidade' || field === 'valor_unitario') {
      item.valor_total = Number(item.quantidade) * Number(item.valor_unitario);
    }
    setItems(newItems);
  };

  const handleSaveCobranca = async () => {
    if (!selectedTutor) {
      toast({ title: 'Atenção', description: 'Selecione um tutor', variant: 'destructive' });
      return;
    }

    const valorTotal = items.reduce((sum, item) => sum + item.valor_total, 0);
    const valorFinal = valorTotal - (Number(newCobranca.desconto) || 0);

    const { data: cobrancaData, error: cobrancaError } = await supabase
      .from('financeiro')
      .insert([{
        tutor_id: selectedTutor.id,
        consulta_id: newCobranca.consulta_id || null,
        descricao: newCobranca.descricao || (items.length > 0 ? items[0].descricao : 'Cobrança'),
        valor_total: valorTotal,
        desconto: Number(newCobranca.desconto) || 0,
        status: newCobranca.status,
        forma_pagamento: newCobranca.forma_pagamento,
        data_vencimento: newCobranca.data_vencimento,
        data_pagamento: newCobranca.status === 'pago' ? format(new Date(), 'yyyy-MM-dd') : null,
        observacoes: newCobranca.observacoes,
        criado_por: user?.id
      }])
      .select()
      .single();

    if (cobrancaError) {
      toast({ title: 'Erro ao salvar', description: cobrancaError.message, variant: 'destructive' });
      return;
    }

    const itemsToInsert = items.map(({ valor_total, ...item }) => {
      const { servico_id, ...cleanItem } = item as any;
      return { ...cleanItem, financeiro_id: cobrancaData.id };
    });
    const { error: itemsError } = await supabase.from('financeiro_itens').insert(itemsToInsert);

    if (itemsError) {
      toast({ title: 'Erro ao salvar itens', description: itemsError.message, variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Cobrança registrada com sucesso!' });
      setIsNewCobrancaOpen(false);
      resetNewCobranca();
      fetchData();
    }
  };

  const resetNewCobranca = () => {
    setSelectedTutor(null);
    setTutorInput('');
    setNewCobranca({
      descricao: '',
      desconto: 0,
      forma_pagamento: 'pix',
      status: 'pendente',
      data_vencimento: format(new Date(), 'yyyy-MM-dd'),
      observacoes: '',
      consulta_id: ''
    });
    setItems([{ descricao: '', quantidade: 1, valor_unitario: 0, valor_total: 0 }]);
  };

  const handleRegistrarPagamento = async () => {
    if (!selectedCobranca) return;
    const { error } = await supabase
      .from('financeiro')
      .update({
        status: 'pago',
        data_pagamento: format(new Date(), 'yyyy-MM-dd'),
        forma_pagamento: selectedCobranca.forma_pagamento
      })
      .eq('id', selectedCobranca.id);

    if (error) {
       toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Pagamento registrado!' });
      setIsPaymentOpen(false);
      fetchData();
    }
  };

  const handleExcluirCobranca = async (financeiroId: string) => {
    try {
      // 1. Primeiro excluir os itens vinculados
      const { error: itemsError } = await supabase
        .from('financeiro_itens')
        .delete()
        .eq('financeiro_id', financeiroId);

      if (itemsError) throw itemsError;

      // 2. Depois excluir a cobrança
      const { error: cobrancaError } = await supabase
        .from('financeiro')
        .delete()
        .eq('id', financeiroId);

      if (cobrancaError) throw cobrancaError;

      toast({ title: "Cobrança excluída com sucesso!" });
      fetchData(); // recarregar listagem
    } catch (err: any) {
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
    }
  };

  const handleConfirmarRascunho = async () => {
    if (!selectedCobranca) return;
    
    try {
      const valorTotal = items.reduce((sum, item) => sum + (Number(item.valor_total) || 0), 0);
      const valorFinal = valorTotal - (Number(selectedCobranca.desconto) || 0);

      // 1. Deletar itens antigos e inserir novos (simplifica a lógica de edição/remoção)
      const { error: deleteError } = await supabase.from('financeiro_itens').delete().eq('financeiro_id', selectedCobranca.id);
      if (deleteError) throw deleteError;
      
      const itemsToInsert = items
        .filter(item => item.valor_total > 0)
        .map(item => ({
          financeiro_id: selectedCobranca.id,
          descricao: item.descricao,
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
          obrigatorio: item.obrigatorio || false
        }));

      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase.from('financeiro_itens').insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }

      // 2. Atualizar status para pendente e valores
      const { error: updateError } = await supabase
        .from('financeiro')
        .update({
          status: 'pendente',
          valor_total: valorTotal,
          valor_final: valorFinal,
        })
        .eq('id', selectedCobranca.id);

      if (updateError) throw updateError;

      toast({ title: 'Sucesso', description: 'Cobrança confirmada como pendente!' });
      setIsReviewOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ title: 'Erro ao confirmar', description: err.message, variant: 'destructive' });
    }
  };

  // Cálculos de Resumo
  const inicioMes = startOfMonth(new Date());
  const hojeStr = format(new Date(), 'yyyy-MM-dd');
  
  const faturamentoDia = cobrancas
    .filter(c => c.status === 'pago' && c.data_pagamento === hojeStr)
    .reduce((sum, c) => sum + Number(c.valor_final || (c.valor_total - c.desconto)), 0);

  const pendenteTotal = cobrancas
    .filter(c => c.status === 'pendente')
    .reduce((sum, c) => sum + Number(c.valor_final || (c.valor_total - c.desconto)), 0);

  const totalMes = cobrancas
    .filter(c => c.status === 'pago' && c.data_pagamento && new Date(c.data_pagamento) >= inicioMes)
    .reduce((sum, c) => sum + Number(c.valor_final || (c.valor_total - c.desconto)), 0);

  // Filtragem
  const cobrancasFiltradas = cobrancas.filter(c => {
    const matchesSearch = c.tutores?.nome.toLowerCase().includes(searchTutor.toLowerCase());
    const matchesStatus = filterStatus === 'todos' || c.status === filterStatus;
    const matchesForma = filterForma === 'todos' || c.forma_pagamento === filterForma;
    
    let matchesPeriodo = true;
    const dataCriacao = new Date(c.criado_em);
    if (filterPeriodo === 'hoje') matchesPeriodo = dataCriacao >= startOfDay(new Date());
    else if (filterPeriodo === 'esta_semana') matchesPeriodo = isWithinInterval(dataCriacao, { start: startOfWeek(new Date()), end: endOfWeek(new Date()) });
    else if (filterPeriodo === 'este_mes') matchesPeriodo = isWithinInterval(dataCriacao, { start: startOfMonth(new Date()), end: endOfMonth(new Date()) });

    return matchesSearch && matchesStatus && matchesForma && matchesPeriodo;
  });

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  if (userData?.cargo === 'veterinario') {
    return <div className="p-8 text-center text-destructive font-bold">Acesso negado. Esta página é restrita a administradores e recepcionistas.</div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
          <p className="text-muted-foreground text-sm">Gerencie cobranças, pagamentos e fluxo de caixa.</p>
        </div>
        <Dialog open={isNewCobrancaOpen} onOpenChange={setIsNewCobrancaOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-sm"><Plus className="h-4 w-4" /> Nova Cobrança</Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Registrar Nova Cobrança</DialogTitle></DialogHeader>
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 relative">
                  <Label>Tutor</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar tutor..." className="pl-9" value={tutorInput} onChange={e => setTutorInput(e.target.value)} />
                  </div>
                  {tutoresFound.length > 0 && !selectedTutor && (
                    <div className="absolute z-10 w-full bg-white border rounded shadow-lg mt-1 overflow-hidden">
                      {tutoresFound.map(t => (
                        <div key={t.id} className="p-2 hover:bg-muted cursor-pointer text-sm" onClick={() => { setSelectedTutor(t); setTutorInput(t.nome); }}>
                          {t.nome} - {t.telefone}
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedTutor && (
                    <div className="flex items-center justify-between bg-primary/5 p-2 rounded border border-primary/20 mt-2">
                       <span className="text-sm font-medium">{selectedTutor.nome}</span>
                       <Button variant="ghost" size="sm" onClick={() => setSelectedTutor(null)}>Alterar</Button>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Vincular Consulta (Opcional)</Label>
                  <Select value={newCobranca.consulta_id} onValueChange={v => setNewCobranca({...newCobranca, consulta_id: v})}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder={selectedTutor ? "Selecione uma consulta..." : "Selecione o tutor primeiro"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma consulta</SelectItem>
                      {tutorConsultas.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {format(new Date(c.data_hora), 'dd/MM/yyyy HH:mm')} - {c.tipo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Itens da Cobrança</h3>
                  <div className="flex gap-2">
                    <Select onValueChange={(val) => {
                      const s = servicos.find(s => s.id === val);
                      if (s) {
                        setItems([...items, { descricao: s.nome, quantidade: 1, valor_unitario: s.preco, valor_total: s.preco }]);
                      }
                    }}>
                      <SelectTrigger className="w-[200px] h-8 text-xs">
                        <SelectValue placeholder="Adicionar do Catálogo..." />
                      </SelectTrigger>
                      <SelectContent>
                        {servicos.map(s => <SelectItem key={s.id} value={s.id}>{s.nome} ({formatCurrency(s.preco)})</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleAddItem}><Plus className="h-3 w-3 mr-1" /> Item Personalizado</Button>
                  </div>
                </div>
                <Table className="border rounded-lg">
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="w-[40%]">Descrição</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead>Valor Unit.</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell><Input value={item.descricao} onChange={e => updateItem(idx, 'descricao', e.target.value)} placeholder="Item ou serviço..." className="h-8" /></TableCell>
                        <TableCell><Input type="number" value={item.quantidade} onChange={e => updateItem(idx, 'quantidade', e.target.value)} className="h-8" /></TableCell>
                        <TableCell><Input type="number" value={item.valor_unitario} onChange={e => updateItem(idx, 'valor_unitario', e.target.value)} placeholder="0.00" className="h-8" /></TableCell>
                        <TableCell className="font-bold text-sm">{formatCurrency(item.valor_total)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => setItems(items.filter((_, i) => i !== idx))} disabled={items.length === 1} className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t">
                <div className="space-y-4">
                   <div className="space-y-1">
                     <Label>Desconto (R$)</Label>
                     <Input type="number" value={newCobranca.desconto} onChange={e => setNewCobranca({...newCobranca, desconto: parseFloat(e.target.value) || 0})} />
                   </div>
                   <div className="space-y-1">
                     <Label>Vencimento</Label>
                     <Input type="date" value={newCobranca.data_vencimento} onChange={e => setNewCobranca({...newCobranca, data_vencimento: e.target.value})} />
                   </div>
                </div>
                <div className="space-y-4">
                   <div className="space-y-1">
                     <Label>Forma de Pagamento</Label>
                     <Select value={newCobranca.forma_pagamento} onValueChange={v => setNewCobranca({...newCobranca, forma_pagamento: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                           {formaPagamentoOptions.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                        </SelectContent>
                     </Select>
                   </div>
                   <div className="space-y-1">
                     <Label>Status Inicial</Label>
                     <Select value={newCobranca.status} onValueChange={v => setNewCobranca({...newCobranca, status: v as any})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                           <SelectItem value="pendente">Pendente</SelectItem>
                           <SelectItem value="pago">Pago Agora</SelectItem>
                        </SelectContent>
                     </Select>
                   </div>
                </div>
                <div className="bg-muted/10 p-4 rounded-lg space-y-2 border">
                   <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal:</span><span>{formatCurrency(items.reduce((sum, i) => sum + i.valor_total, 0))}</span></div>
                   <div className="flex justify-between text-sm text-red-600 font-medium"><span>Desconto:</span><span>- {formatCurrency(newCobranca.desconto)}</span></div>
                   <div className="flex justify-between text-xl font-bold border-t pt-2 mt-2"><span>Total:</span><span className="text-primary">{formatCurrency(items.reduce((sum, i) => sum + i.valor_total, 0) - newCobranca.desconto)}</span></div>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Observações Internas</Label>
                <Textarea value={newCobranca.observacoes} onChange={e => setNewCobranca({...newCobranca, observacoes: e.target.value})} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewCobrancaOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveCobranca}>Confirmar Cobrança</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Resumo Financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Faturamento do Dia</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{formatCurrency(faturamentoDia)}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Soma de pagamentos hoje</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pendente Total</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">{formatCurrency(pendenteTotal)}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Valor total a receber</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total do Mês</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{formatCurrency(totalMes)}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Mês: {format(new Date(), 'MMMM', { locale: ptBR })}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Registros</CardTitle>
            <Receipt className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{cobrancasFiltradas.length}</div>
            <p className="text-[10px] text-muted-foreground mt-1">No período selecionado</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
             <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por tutor..." className="pl-9" value={searchTutor} onChange={e => setSearchTutor(e.target.value)} />
             </div>
             <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <Select value={filterPeriodo} onValueChange={setFilterPeriodo}>
                  <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Período" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todo Período</SelectItem>
                    <SelectItem value="hoje">Hoje</SelectItem>
                    <SelectItem value="esta_semana">Esta Semana</SelectItem>
                    <SelectItem value="este_mes">Este Mês</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos Status</SelectItem>
                    <SelectItem value="rascunho">Rascunho</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                    <SelectItem value="reembolsado">Reembolsado</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterForma} onValueChange={setFilterForma}>
                  <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Pagamento" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Formas Pagto.</SelectItem>
                    {formaPagamentoOptions.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
             </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tutor</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor Final</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Carregando...</TableCell></TableRow>
              ) : cobrancasFiltradas.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma cobrança encontrada.</TableCell></TableRow>
              ) : cobrancasFiltradas.map((c) => (
                <TableRow key={c.id} className="group transition-colors hover:bg-muted/30">
                  <TableCell className="text-sm font-medium">
                    {format(new Date(c.criado_em), 'dd/MM/yyyy HH:mm')}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold">{c.tutores?.nome}</div>
                    <div className="text-[10px] text-muted-foreground">{c.tutores?.telefone}</div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate" title={c.descricao}>{c.descricao}</TableCell>
                  <TableCell className="font-bold text-foreground">{formatCurrency(c.valor_final || (c.valor_total - c.desconto))}</TableCell>
                  <TableCell className="text-xs">{getFormaPagamentoLabel(c.forma_pagamento)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${statusColors[c.status]} px-2 py-0`}>
                      {statusLabels[c.status] || c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                      {c.status === 'rascunho' && (
                        <Button variant="outline" size="sm" className="h-8 gap-1 text-primary border-primary/20 hover:bg-primary/5" onClick={() => { setSelectedCobranca(c); setIsReviewOpen(true); }}>
                          <ArrowRight className="h-3 w-3" /> Revisar
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Ver Detalhes" onClick={() => { setSelectedCobranca(c); setIsDetailOpen(true); }}><Eye className="h-4 w-4" /></Button>
                      {c.status === 'pendente' && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" title="Registrar Pagamento" onClick={() => { setSelectedCobranca(c); setIsPaymentOpen(true); }}><CheckCircle2 className="h-4 w-4" /></Button>
                      )}
                      {userData?.cargo === 'admin' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" title="Excluir Cobrança">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir cobrança?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita e removerá todos os itens vinculados a esta fatura.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleExcluirCobranca(c.id)} className="bg-red-600 hover:bg-red-700">
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Pagamento */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Pagamento</DialogTitle></DialogHeader>
          {selectedCobranca && (
            <div className="space-y-4 py-4">
              <div className="text-center p-4 bg-muted/20 rounded border border-dashed">
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Valor Pendente</p>
                <h1 className="text-4xl font-black text-primary">{formatCurrency(selectedCobranca.valor_final || (selectedCobranca.valor_total - selectedCobranca.desconto))}</h1>
              </div>
              <div className="space-y-2">
                <Label>Forma de Pagamento Utilizada</Label>
                <Select value={selectedCobranca.forma_pagamento} onValueChange={v => setSelectedCobranca({...selectedCobranca, forma_pagamento: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {formaPagamentoOptions.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="p-3 bg-green-50 text-green-700 text-xs rounded border border-green-200">
                A data do pagamento será registrada como hoje ({format(new Date(), 'dd/MM/yyyy')}).
              </div>
              <Button onClick={handleRegistrarPagamento} className="w-full h-12 text-lg">Confirmar Recebimento</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Detalhes */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Detalhes da Cobrança</DialogTitle></DialogHeader>
          {selectedCobranca && (
            <div className="space-y-6 py-4 overflow-y-auto pr-2">
              <div className="flex items-center justify-between border-b pb-4">
                 <div className="space-y-1">
                   <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">ID da Fatura</p>
                   <p className="font-mono text-sm">{selectedCobranca.id}</p>
                 </div>
                 <Badge variant="outline" className={`${statusColors[selectedCobranca.status]} text-sm px-4 py-1`}>{statusLabels[selectedCobranca.status] || selectedCobranca.status}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-6 text-sm">
                 <div className="space-y-4">
                   <div>
                     <p className="font-bold text-slate-500 uppercase text-[10px] mb-1">Tutor Responsável</p>
                     <p className="font-semibold text-base">{selectedCobranca.tutores?.nome}</p>
                     <p className="text-muted-foreground">{selectedCobranca.tutores?.telefone}</p>
                   </div>
                   <div>
                     <p className="font-bold text-slate-500 uppercase text-[10px] mb-1">Vencimento</p>
                     <p className="font-semibold">{format(new Date(selectedCobranca.data_vencimento), 'dd/MM/yyyy')}</p>
                   </div>
                 </div>
                 <div className="space-y-4">
                   <div>
                     <p className="font-bold text-slate-500 uppercase text-[10px] mb-1">Forma de Pagamento</p>
                     <p className="font-semibold">{getFormaPagamentoLabel(selectedCobranca.forma_pagamento)}</p>
                   </div>
                   {selectedCobranca.data_pagamento && (
                     <div>
                       <p className="font-bold text-slate-500 uppercase text-[10px] mb-1">Pagamento realizado em</p>
                       <p className="font-bold text-green-600">{format(new Date(selectedCobranca.data_pagamento), 'dd/MM/yyyy')}</p>
                     </div>
                   )}
                 </div>
              </div>

              <div className="space-y-3">
                 <p className="font-bold text-slate-500 uppercase text-[10px] tracking-widest border-b pb-1">Descrição dos Itens</p>
                 <div className="space-y-2">
                    {selectedCobranca.financeiro_itens?.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm py-2 border-b border-dashed last:border-0">
                         <div>
                            <p className="font-bold">{item.descricao}</p>
                            <p className="text-xs text-muted-foreground">{item.quantidade}x {formatCurrency(item.valor_unitario)}</p>
                         </div>
                         <p className="font-bold">{formatCurrency(item.valor_total)}</p>
                      </div>
                    ))}
                 </div>
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                 <div className="flex justify-between text-sm"><span>Subtotal:</span><span>{formatCurrency(selectedCobranca.valor_total)}</span></div>
                 <div className="flex justify-between text-sm text-red-600"><span>Desconto:</span><span>- {formatCurrency(selectedCobranca.desconto)}</span></div>
                 <div className="flex justify-between text-xl font-bold border-t pt-2 mt-2"><span>Total Final:</span><span className="text-primary">{formatCurrency(selectedCobranca.valor_final)}</span></div>
              </div>

              {selectedCobranca.observacoes && (
                <div className="p-3 bg-muted/30 rounded border text-xs italic">
                  <strong>Observações:</strong> {selectedCobranca.observacoes}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Revisar e Confirmar Rascunho */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Revisar e Confirmar Cobrança</DialogTitle>
          </DialogHeader>
          
          {selectedCobranca && (
            <div className="space-y-6 py-4">
              <div className="flex justify-between items-start bg-primary/5 p-4 rounded-lg border border-primary/10">
                <div>
                  <p className="text-[10px] uppercase font-bold text-primary tracking-wider">Tutor</p>
                  <p className="font-bold text-lg">{selectedCobranca.tutores?.nome}</p>
                  <p className="text-xs text-muted-foreground">{selectedCobranca.tutores?.telefone}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-primary tracking-wider">Consulta</p>
                  <p className="text-sm font-medium">{selectedCobranca.consultas?.tipo || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground">{selectedCobranca.consultas?.data_hora ? format(new Date(selectedCobranca.consultas.data_hora), 'dd/MM/yyyy HH:mm') : ''}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Itens para Cobrança</h3>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={handleAddItem}>
                    <Plus className="h-3 w-3" /> Adicionar Item
                  </Button>
                </div>
                
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[45%]">Descrição</TableHead>
                        <TableHead>Qtd</TableHead>
                        <TableHead>V. Unit</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, idx) => (
                        <TableRow key={idx} className={item.obrigatorio ? 'bg-green-50/30' : ''}>
                          <TableCell>
                            <div className="relative">
                              <Input 
                                value={item.descricao} 
                                onChange={e => updateItem(idx, 'descricao', e.target.value)} 
                                className="h-8 text-sm"
                                disabled={item.obrigatorio}
                              />
                              {item.obrigatorio && (
                                <span className="absolute -top-2 -left-1 bg-green-500 text-white text-[8px] px-1 rounded uppercase font-bold">Obrigatório</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number" 
                              value={item.quantidade} 
                              onChange={e => updateItem(idx, 'quantidade', e.target.value)} 
                              className="h-8 w-16 text-sm"
                              disabled={item.obrigatorio}
                            />
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number" 
                              value={item.valor_unitario} 
                              onChange={e => updateItem(idx, 'valor_unitario', e.target.value)} 
                              className="h-8 w-24 text-sm"
                              disabled={item.obrigatorio}
                            />
                          </TableCell>
                          <TableCell className="font-bold text-sm">
                            {formatCurrency(item.valor_total)}
                          </TableCell>
                          <TableCell>
                            {!item.obrigatorio && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-destructive"
                                onClick={() => setItems(items.filter((_, i) => i !== idx))}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-4 border-t">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Observações</Label>
                    <Textarea 
                      placeholder="Observações internas..." 
                      className="text-sm min-h-[80px]"
                      value={selectedCobranca.observacoes}
                      onChange={e => setSelectedCobranca({...selectedCobranca, observacoes: e.target.value})}
                    />
                  </div>
                </div>
                <div className="bg-muted/30 p-4 rounded-lg space-y-2 border">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground uppercase text-[10px] font-bold">Subtotal:</span>
                    <span className="font-medium">{formatCurrency(items.reduce((sum, i) => sum + i.valor_total, 0))}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground uppercase text-[10px] font-bold">Desconto:</span>
                    <Input 
                      type="number" 
                      className="h-7 w-24 text-right text-sm bg-white" 
                      value={selectedCobranca.desconto}
                      onChange={e => setSelectedCobranca({...selectedCobranca, desconto: Number(e.target.value)})}
                    />
                  </div>
                  <div className="flex justify-between text-xl font-bold border-t pt-2 mt-2 text-primary">
                    <span className="uppercase text-xs self-center">Total Final:</span>
                    <span>{formatCurrency(items.reduce((sum, i) => sum + i.valor_total, 0) - selectedCobranca.desconto)}</span>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setIsReviewOpen(false)}>Cancelar</Button>
                <Button onClick={handleConfirmarRascunho} className="bg-green-600 hover:bg-green-700 h-11 px-8 gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Confirmar e Gerar Cobrança
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
