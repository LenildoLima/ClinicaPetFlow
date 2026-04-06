import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart, User, UserPlus, Search, Calendar, Package, Plus, Trash2, Tag, CreditCard, CheckCircle2, CheckCircle, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface FinanceiroItem {
  id?: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  obrigatorio?: boolean;
}

const formaPagamentoOptions = [
  { value: 'dinheiro', label: 'Dinheiro', icone: '💵' },
  { value: 'pix', label: 'Pix', icone: '📱' },
  { value: 'cartao_debito', label: 'Cartão Débito', icone: '💳' },
  { value: 'cartao_credito', label: 'Cartão Crédito', icone: '💳' },
  { value: 'boleto', label: 'Boleto', icone: '📄' },
  { value: 'outro', label: 'Outro', icone: '💰' },
];

export default function NovaCobranca() {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

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
  const [produtos, setProdutos] = useState<any[]>([]);
  const [tutorConsultas, setTutorConsultas] = useState<any[]>([]);
  
  const [isTutorSearchOpen, setIsTutorSearchOpen] = useState(false);
  const [tutorSearchTerm, setTutorSearchTerm] = useState('');
  
  const [openItemSearch, setOpenItemSearch] = useState<number | null>(null);
  
  const [isQuickTutorOpen, setIsQuickTutorOpen] = useState(false);
  const [quickTutor, setQuickTutor] = useState({ nome: '', telefone: '' });
  const [isSavingTutor, setIsSavingTutor] = useState(false);

  const descriptionRefs = useRef<(HTMLInputElement | null)[]>([]);
  const quantityRefs = useRef<(HTMLInputElement | null)[]>([]);
  const unitPriceRefs = useRef<(HTMLInputElement | null)[]>([]);
  const discountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userData?.cargo === 'veterinario') {
      navigate('/');
    }
  }, [userData, navigate]);

  useEffect(() => {
    const fetchCatalog = async () => {
      const { data: servs } = await supabase.from('servicos').select('*').order('nome');
      setServicos(servs || []);

      const { data: prods } = await supabase.from('estoque_produtos').select('*').eq('ativo', true).order('nome');
      setProdutos(prods || []);
    };
    fetchCatalog();
  }, []);

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

  const formatPhone = (value: string) => {
    const phone = value.replace(/\D/g, '');
    if (phone.length <= 10) return phone.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2').replace(/(-\d{4})\d+?$/, '$1');
    return phone.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').replace(/(-\d{4})\d+?$/, '$1');
  };

  const handleAddItem = () => {
    setItems([...items, { descricao: '', quantidade: 1, valor_unitario: 0, valor_total: 0 }]);
    setTimeout(() => {
      const lastIdx = items.length;
      if (descriptionRefs.current[lastIdx]) {
        descriptionRefs.current[lastIdx]?.click();
        descriptionRefs.current[lastIdx]?.focus();
      }
    }, 50);
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

  const handleSaveQuickTutor = async () => {
    if (!quickTutor.nome || !quickTutor.telefone) {
      toast({ title: 'Atenção', description: 'Preencha nome e telefone', variant: 'destructive' });
      return;
    }
    setIsSavingTutor(true);
    const { data, error } = await supabase.from('tutores').insert([{ nome: quickTutor.nome, telefone: quickTutor.telefone }]).select().single();
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Tutor cadastrado!' });
      setSelectedTutor(data);
      setTutorInput(data.nome);
      setQuickTutor({ nome: '', telefone: '' });
      setIsQuickTutorOpen(false);
    }
    setIsSavingTutor(false);
  };

  const handleSaveCobranca = async () => {
    if (!selectedTutor) {
      toast({ title: 'Atenção', description: 'Selecione um tutor', variant: 'destructive' });
      return;
    }

    const valorTotal = items.reduce((sum, item) => sum + item.valor_total, 0);

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
      navigate('/financeiro');
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const totalItems = items.reduce((sum, i) => sum + i.valor_total, 0);
  const totalFinal = totalItems - newCobranca.desconto;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/financeiro')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
            <ShoppingCart className="w-6 h-6 text-green-600" />
            Registrar Nova Cobrança
          </h1>
          <p className="text-muted-foreground text-sm">Preencha os dados da cobrança e salve no financeiro.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Coluna Esquerda: Tutor, Itens e Observações */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 space-y-3 relative">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-blue-700 font-semibold mb-0 text-base">
                  <User className="w-4 h-4" /> Tutor Responsável
                </Label>
                {!selectedTutor && (
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] uppercase font-bold text-primary gap-1" onClick={() => setIsQuickTutorOpen(!isQuickTutorOpen)}>
                    <UserPlus className="h-3 w-3" /> {isQuickTutorOpen ? 'Cancelar' : 'Novo'}
                  </Button>
                )}
              </div>

              {isQuickTutorOpen && !selectedTutor ? (
                <div className="p-3 bg-white border border-blue-100 rounded-md space-y-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold">Nome do Novo Tutor</Label>
                    <Input className="h-8 text-sm" value={quickTutor.nome} onChange={e => setQuickTutor({...quickTutor, nome: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold">Telefone</Label>
                    <Input className="h-8 text-sm" value={quickTutor.telefone} onChange={e => setQuickTutor({...quickTutor, telefone: formatPhone(e.target.value)})} maxLength={15} />
                  </div>
                  <Button size="sm" className="w-full h-8 text-xs bg-primary hover:bg-primary/90" onClick={handleSaveQuickTutor} disabled={isSavingTutor}>
                    {isSavingTutor ? 'Salvando...' : 'Cadastrar e Selecionar'}
                  </Button>
                </div>
              ) : (
                <div className="relative z-50">
                  <Command shouldFilter={false} className="overflow-visible bg-white border border-gray-300 rounded-md shadow-sm [&_[cmdk-input-wrapper]]:border-none focus-within:ring-2 focus-within:ring-green-500 focus-within:border-green-500 transition-all">
                    <CommandInput 
                      placeholder="Buscar tutor..." 
                      className="h-10"
                      value={tutorInput} 
                      onValueChange={(val) => {
                        setTutorSearchTerm(val); 
                        setTutorInput(val); 
                        setIsTutorSearchOpen(val.length > 0);
                      }}
                      onFocus={() => {
                        if (tutorInput.length >= 2) setIsTutorSearchOpen(true);
                      }}
                      onBlur={() => setTimeout(() => setIsTutorSearchOpen(false), 200)}
                    />
                    
                    {isTutorSearchOpen && tutoresFound.length > 0 && (
                      <div className="absolute top-[45px] left-0 w-[400px] rounded-md border border-slate-200 bg-white shadow-lg outline-none animate-in fade-in-0 zoom-in-95 z-[60]">
                        <CommandList className="max-h-[300px] overflow-y-auto">
                          <CommandGroup heading="Tutores Encontrados">
                            {tutoresFound.map(t => (
                              <CommandItem 
                                key={t.id} 
                                value={t.id} 
                                onSelect={() => { 
                                  setSelectedTutor(t); 
                                  setTutorSearchTerm(t.nome); 
                                  setTutorInput(t.nome); 
                                  setTutoresFound([]); 
                                  setIsTutorSearchOpen(false); 
                                  setTimeout(() => descriptionRefs.current[0]?.focus(), 100); 
                                }} 
                                className="text-sm py-2 cursor-pointer data-[selected='true']:bg-green-50 data-[selected='true']:text-green-900 transition-colors"
                              >
                                <div className="flex flex-col">
                                  <span className="font-semibold">{t.nome}</span>
                                  <span className="text-xs text-muted-foreground">{t.telefone}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </div>
                    )}
                  </Command>
                </div>
              )}
              {selectedTutor && (
                <div className="flex items-center justify-between bg-white p-3 rounded border border-blue-100">
                  <div className="flex flex-col"><span className="text-sm font-semibold">{selectedTutor.nome}</span><span className="text-xs text-muted-foreground">{selectedTutor.telefone}</span></div>
                  <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800" onClick={() => { setSelectedTutor(null); setTutorInput(''); setTutorSearchTerm(''); }}>Alterar</Button>
                </div>
              )}
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-3">
              <Label className="flex items-center gap-2 text-slate-700 font-semibold mb-0 text-base">
                <Calendar className="w-4 h-4" /> Vincular Consulta (Opcional)
              </Label>
              <Select value={newCobranca.consulta_id} onValueChange={v => setNewCobranca({...newCobranca, consulta_id: v})}>
                <SelectTrigger className="bg-white border-slate-300 h-10 mt-1">
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

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between mb-3 border-b border-gray-200 pb-3">
              <Label className="flex items-center gap-2 text-gray-700 font-semibold text-base mb-0">
                <Package className="w-5 h-5" /> Itens da Cobrança
              </Label>
              <Button size="sm" variant="outline" className="text-green-600 border-green-300 bg-white shadow-sm" onClick={handleAddItem}>
                <Plus className="w-4 h-4 mr-1" /> Item Personalizado
              </Button>
            </div>
            <Table className="border-none w-full">
              <TableHeader>
                <TableRow className="bg-green-600 hover:bg-green-600 border-none">
                  <TableHead className="text-left text-white rounded-tl-lg font-medium p-3">Descrição</TableHead>
                  <TableHead className="w-[15%] text-center text-white font-medium p-3">Qtd</TableHead>
                  <TableHead className="w-[20%] text-right text-white font-medium p-3">Valor Unit.</TableHead>
                  <TableHead className="w-[20%] text-right text-white font-medium p-3">Total</TableHead>
                  <TableHead className="w-[5%] rounded-tr-lg p-3"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, idx) => (
                  <TableRow key={idx} className="group hover:bg-white transition-colors bg-transparent border-b border-gray-200">
                    <TableCell className="p-3">
                      <div className="relative z-40">
                        <Command className="overflow-visible bg-white border border-gray-300 rounded-md shadow-sm [&_[cmdk-input-wrapper]]:border-none focus-within:ring-2 focus-within:ring-green-500 focus-within:border-green-500 transition-all">
                          <CommandInput 
                            ref={(el) => (descriptionRefs.current[idx] = el)} 
                            value={item.descricao} 
                            onValueChange={(val) => {
                              updateItem(idx, 'descricao', val);
                              setOpenItemSearch(idx);
                            }} 
                            onFocus={() => setOpenItemSearch(idx)}
                            onBlur={() => setTimeout(() => {
                              if (openItemSearch === idx) setOpenItemSearch(null);
                            }, 200)}
                            placeholder="Busque no catálogo ou digite..." 
                            className="h-10 font-medium" 
                          />
                          {openItemSearch === idx && (
                            <div className="absolute top-[45px] left-0 w-[450px] rounded-md border border-slate-200 bg-white shadow-lg outline-none z-50 animate-in fade-in-0 zoom-in-95">
                              <CommandList className="max-h-[350px] overflow-y-auto">
                                <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
                                <CommandGroup heading="Serviços e Vacinas">
                                  {servicos.map((s) => (
                                    <CommandItem key={`serv-${idx}-${s.id}`} value={s.nome} onSelect={() => { updateItem(idx, 'descricao', s.nome); updateItem(idx, 'valor_unitario', s.preco); setOpenItemSearch(null); setTimeout(() => quantityRefs.current[idx]?.focus(), 50); }} className="flex justify-between items-center py-3 border-b last:border-0 border-gray-100 cursor-pointer">
                                      <div className="flex flex-col"><span className="font-semibold text-sm">{s.nome}</span><span className="text-[10px] text-muted-foreground uppercase tracking-wide">Serviço</span></div>
                                      <span className="font-bold text-primary">{formatCurrency(s.preco)}</span>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                                <CommandGroup heading="Produtos e Estoque">
                                  {produtos.map((p) => (
                                    <CommandItem key={`prod-${idx}-${p.id}`} value={`${p.nome} ${p.marca || ''}`} onSelect={() => { updateItem(idx, 'descricao', `${p.nome} (${p.marca || ''})`); updateItem(idx, 'valor_unitario', p.preco_venda); setOpenItemSearch(null); setTimeout(() => quantityRefs.current[idx]?.focus(), 50); }} className="flex justify-between items-center py-3 border-b last:border-0 border-gray-100 cursor-pointer">
                                      <div className="flex flex-col"><span className="font-semibold text-sm">{p.nome}</span><span className="text-[10px] text-muted-foreground uppercase tracking-wide">{p.unidade} {p.marca ? `— ${p.marca}` : ''}</span></div>
                                      <div className="flex flex-col items-end"><span className="font-bold text-green-600">{formatCurrency(p.preco_venda)}</span><span className="text-[10px] text-muted-foreground mt-0.5">Estoque: {p.estoque_atual}</span></div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </div>
                          )}
                        </Command>
                      </div>
                    </TableCell>
                    <TableCell className="p-3">
                      <Input ref={(el) => (quantityRefs.current[idx] = el)} type="number" value={item.quantidade} onChange={(e) => updateItem(idx, 'quantidade', Number(e.target.value))} onKeyDown={(e) => { if (e.key === 'Enter') unitPriceRefs.current[idx]?.focus(); }} className="h-10 text-center bg-white border-gray-300 font-medium" />
                    </TableCell>
                    <TableCell className="p-3">
                      <Input ref={(el) => (unitPriceRefs.current[idx] = el)} type="number" step="0.01" value={item.valor_unitario} onChange={(e) => updateItem(idx, 'valor_unitario', Number(e.target.value))} className="h-10 text-right bg-white border-gray-300 font-medium" placeholder="0,00" onKeyDown={(e) => { if (e.key === 'Tab' && idx === items.length - 1) { e.preventDefault(); handleAddItem(); } else if (e.key === 'Enter') { e.preventDefault(); if (idx === items.length - 1) discountRef.current?.focus(); else descriptionRefs.current[idx + 1]?.focus(); } }} />
                    </TableCell>
                    <TableCell className="p-3 text-right font-bold text-base text-gray-800">
                      {formatCurrency(item.valor_total)}
                    </TableCell>
                    <TableCell className="p-3">
                      <Button variant="ghost" size="icon" onClick={() => setItems(items.filter((_, i) => i !== idx))} className="h-8 w-8 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">Observações Internas</Label>
            <Textarea className="bg-white border-gray-300 h-24" value={newCobranca.observacoes} onChange={e => setNewCobranca({...newCobranca, observacoes: e.target.value})} placeholder="Adicione notas visíveis apenas para a equipe..." />
          </div>
        </div>

        {/* Coluna Direita: Pagamento, Resumo e Confirmação */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          <div className="bg-white border shadow-sm rounded-xl overflow-hidden">
            <div className="bg-slate-50 border-b p-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-slate-500" />
                Resumo e Pagamento
              </h3>
            </div>
            
            <div className="p-5 space-y-5">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-2">
                <Label className="flex items-center gap-2 text-orange-700 font-semibold mb-0">
                  <Tag className="w-4 h-4" /> Desconto (R$)
                </Label>
                <Input ref={discountRef} type="number" className="border-orange-300 bg-white h-10 font-bold text-orange-800" value={newCobranca.desconto} onChange={e => setNewCobranca({...newCobranca, desconto: parseFloat(e.target.value) || 0})} />
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-2">
                <Label className="flex items-center gap-2 text-purple-700 font-semibold mb-0">
                  <CreditCard className="w-4 h-4" /> Forma de Pagamento
                </Label>
                <Select value={newCobranca.forma_pagamento} onValueChange={v => setNewCobranca({...newCobranca, forma_pagamento: v})}>
                  <SelectTrigger className="border-purple-300 bg-white flex w-full justify-between items-center h-10 font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {formaPagamentoOptions.map(f => (
                      <SelectItem key={f.value} value={f.value}>
                        <span className="flex items-center gap-2 font-medium"><span>{f.icone}</span> <span>{f.label}</span></span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-b border-dashed py-4">
                <div className="space-y-2">
                  <Label className="text-gray-600 font-semibold">Vencimento</Label>
                  <Input className="border-slate-300 bg-white h-10 text-sm font-medium" type="date" value={newCobranca.data_vencimento} onChange={e => setNewCobranca({...newCobranca, data_vencimento: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-600 font-semibold">Status Inicial</Label>
                  <Select value={newCobranca.status} onValueChange={v => setNewCobranca({...newCobranca, status: v as any})}>
                    <SelectTrigger className="border-slate-300 bg-white h-10 font-medium text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="pago">Pago Agora</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-green-600 text-white rounded-xl p-5 shadow-inner">
                <div className="flex justify-between text-green-100 text-sm mb-2 pb-2 border-b border-green-500/50">
                  <span>Subtotal:</span>
                  <span className="font-medium">{formatCurrency(totalItems)}</span>
                </div>
                {newCobranca.desconto > 0 && (
                  <div className="flex justify-between text-orange-200 text-sm mb-3 pb-2 border-b border-green-500/50">
                    <span>Desconto:</span>
                    <span className="font-bold">- {formatCurrency(newCobranca.desconto)}</span>
                  </div>
                )}
                <div className="flex justify-between items-end mt-2">
                  <span className="font-medium text-green-100">Total Final:</span>
                  <span className="font-bold text-3xl tracking-tight">{formatCurrency(totalFinal)}</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-3">
                <Button onClick={handleSaveCobranca} className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg font-bold shadow-md hover:shadow-lg transition-all" size="lg">
                  <CheckCircle className="w-6 h-6 mr-2" /> Confirmar Cobrança
                </Button>
                <Button variant="outline" onClick={() => navigate('/financeiro')} className="w-full py-6 text-base font-medium text-gray-600 hover:text-gray-900 border-gray-300">
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
