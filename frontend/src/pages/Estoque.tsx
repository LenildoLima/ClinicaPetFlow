import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, Search, Filter, ArrowUpRight, ArrowDownLeft, 
  Package, AlertTriangle, XCircle, TrendingUp,
  Edit, Trash2, History, Tag
} from 'lucide-react';
import { ImageUpload } from '@/components/ImageUpload';
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from '@/components/EmptyState';
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from '@/components/ui/card';
import { 
  Tabs, TabsContent, TabsList, TabsTrigger 
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, SelectContent,SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Categoria {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
}

interface Produto {
  id: string;
  categoria_id: string;
  nome: string;
  descricao: string;
  marca: string;
  unidade: string;
  preco_custo: number;
  preco_venda: number;
  estoque_atual: number;
  estoque_minimo: number;
  codigo_barras: string;
  foto_url: string;
  ativo: boolean;
  estoque_categorias?: { nome: string };
}

interface Movimentacao {
  id: string;
  produto_id: string;
  tipo: 'entrada' | 'saida' | 'venda' | 'ajuste';
  quantidade: number;
  quantidade_anterior: number;
  quantidade_atual: number;
  motivo: string;
  criado_em: string;
  registrado_por: string;
  estoque_produtos?: { nome: string; marca: string; unidade: string };
  usuarios?: { nome: string };
}

const unidades = [
  { value: 'unidade', label: 'Unidade' },
  { value: 'caixa', label: 'Caixa' },
  { value: 'frasco', label: 'Frasco' },
  { value: 'kg', label: 'Kg' },
  { value: 'g', label: 'Gramas' },
  { value: 'ml', label: 'ML' },
  { value: 'l', label: 'Litro' },
  { value: 'saco', label: 'Saco' }
];

export default function Estoque() {
  const { userData } = useAuth();
  const { toast } = useToast();
  const isAdmin = userData?.cargo === 'admin';
  const isRecepcionista = userData?.cargo === 'recepcionista';
  const canManage = isAdmin;
  const canStockIn = isAdmin || isRecepcionista;

  const [activeTab, setActiveTab] = useState('produtos');
  const [loading, setLoading] = useState(true);
  
  // Estados de Dados
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  
  // Filtros Produtos
  const [search, setSearch] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('todas');
  const [filterStatus, setFilterStatus] = useState('todos');

  // Filtros Movimentações
  const [movSearch, setMovSearch] = useState('');
  const [movType, setMovType] = useState('todos');
  const [movPeriod, setMovPeriod] = useState('todos');

  // Modais
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  
  // Dados Formulários
  const [selectedProduct, setSelectedProduct] = useState<Produto | null>(null);
  const [productForm, setProductForm] = useState<Partial<Produto>>({
    nome: '', categoria_id: '', preco_custo: 0, preco_venda: 0, 
    estoque_atual: 0, estoque_minimo: 0, unidade: 'unidade', ativo: true
  });
  
  const [stockInForm, setStockInForm] = useState({ quantidade: 0, motivo: 'Compra' });
  const [categoryForm, setCategoryForm] = useState<Partial<Categoria>>({ nome: '', descricao: '', ativo: true });
  const [selectedCategory, setSelectedCategory] = useState<Categoria | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes, movRes] = await Promise.all([
        supabase.from('estoque_produtos').select('*, estoque_categorias(nome)').eq('ativo', true).order('nome'),
        supabase.from('estoque_categorias').select('*').order('nome'),
        supabase.from('estoque_movimentacoes')
          .select(`
            *,
            estoque_produtos ( nome, unidade, marca ),
            usuarios!registrado_por ( nome )
          `)
          .order('criado_em', { ascending: false })
          .limit(200)
      ]);

      if (prodRes.data) setProdutos(prodRes.data);
      if (catRes.data) setCategorias(catRes.data);
      if (movRes.data) setMovimentacoes(movRes.data);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadImagem = async (file: File, bucket: string, path: string) => {
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true });
    
    if (uploadError) throw uploadError;
    
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    
    return urlData.publicUrl;
  };

  const handleSaveProduct = async () => {
    if (!productForm.nome || !productForm.categoria_id) {
      toast({ title: 'Atenção', description: 'Nome e categoria são obrigatórios', variant: 'destructive' });
      return;
    }

    try {
      let fotoUrl = productForm.foto_url;

      if (fotoFile) {
        const fileName = `produto-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        fotoUrl = await handleUploadImagem(fotoFile, 'produtos', fileName);
      }

      const payload = { ...productForm, foto_url: fotoUrl };
      delete (payload as any).estoque_categorias; // Limpar dados de relação antes de salvar

      let error;
      if (selectedProduct) {
        ({ error } = await supabase.from('estoque_produtos').update(payload).eq('id', selectedProduct.id));
      } else {
        ({ error } = await supabase.from('estoque_produtos').insert([payload]));
      }

      if (error) throw error;

      toast({ title: selectedProduct ? 'Produto atualizado!' : 'Produto cadastrado!' });
      setIsProductModalOpen(false);
      setFotoFile(null);
      fetchData();
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    }
  };

  const handleStockIn = async () => {
    if (!selectedProduct || stockInForm.quantidade <= 0) return;

    try {
      const novaQtde = selectedProduct.estoque_atual + stockInForm.quantidade;
      
      // 1. Update Produto
      const { error: prodError } = await supabase
        .from('estoque_produtos')
        .update({ estoque_atual: novaQtde, atualizado_em: new Date().toISOString() })
        .eq('id', selectedProduct.id);
      
      if (prodError) throw prodError;

      // 2. Insert Movimentação
      const { data: { user } } = await supabase.auth.getUser();
      const { error: movError } = await supabase.from('estoque_movimentacoes').insert({
        produto_id: selectedProduct.id,
        tipo: 'entrada',
        quantidade: stockInForm.quantidade,
        quantidade_anterior: selectedProduct.estoque_atual,
        quantidade_atual: novaQtde,
        motivo: stockInForm.motivo,
        registrado_por: user?.id
      });

      if (movError) throw movError;

      toast({ title: 'Entrada registrada!', description: `${stockInForm.quantidade} unidades adicionadas ao estoque.` });
      setIsStockInModalOpen(false);
      setStockInForm({ quantidade: 0, motivo: 'Compra' });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Erro na movimentação', description: err.message, variant: 'destructive' });
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.nome) return;
    try {
      let error;
      if (selectedCategory) {
        ({ error } = await supabase.from('estoque_categorias').update(categoryForm).eq('id', selectedCategory.id));
      } else {
        ({ error } = await supabase.from('estoque_categorias').insert([categoryForm]));
      }
      if (error) throw error;
      toast({ title: 'Categoria salva!' });
      setIsCategoryModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const filteredProdutos = produtos.filter(p => {
    const matchesSearch = p.nome.toLowerCase().includes(search.toLowerCase()) || 
                         p.marca?.toLowerCase().includes(search.toLowerCase());
    const matchesCat = filterCategoria === 'todas' || p.categoria_id?.toString() === filterCategoria?.toString();
    const matchesStatus = 
      filterStatus === 'todos' || 
      (filterStatus === 'ok' && p.estoque_atual > p.estoque_minimo) ||
      (filterStatus === 'baixo' && p.estoque_atual <= p.estoque_minimo && p.estoque_atual > 0) ||
      (filterStatus === 'esgotado' && p.estoque_atual === 0);
    
    return matchesSearch && matchesCat && matchesStatus;
  });

  const filteredMovimentacoes = movimentacoes.filter(m => {
    const term = movSearch.toLowerCase();
    const productName = m.estoque_produtos?.nome?.toLowerCase() || '';
    const motivo = m.motivo?.toLowerCase() || '';
    const matchesSearch = productName.includes(term) || motivo.includes(term);
    const matchesType = movType === 'todos' || m.tipo === movType;
    
    let matchesPeriod = true;
    if (movPeriod !== 'todos') {
      const dataMov = new Date(m.criado_em);
      const hoje = new Date();
      if (movPeriod === 'hoje') {
        matchesPeriod = dataMov.toDateString() === hoje.toDateString();
      } else if (movPeriod === 'mes') {
        matchesPeriod = dataMov.getMonth() === hoje.getMonth() && dataMov.getFullYear() === hoje.getFullYear();
      } else if (movPeriod === 'ano') {
        matchesPeriod = dataMov.getFullYear() === hoje.getFullYear();
      }
    }

    return matchesSearch && matchesType && matchesPeriod;
  });

  // Cálculos de Resumo
  const totalAtivos = produtos.length;
  const baixoEstoque = produtos.filter(p => p.estoque_atual <= p.estoque_minimo && p.estoque_atual > 0).length;
  const semEstoque = produtos.filter(p => p.estoque_atual === 0).length;
  const valorEstoque = produtos.reduce((acc, p) => acc + (p.preco_custo * p.estoque_atual), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gerenciamento de Estoque</h1>
          <p className="text-muted-foreground">Controle de produtos, suprimentos e movimentações.</p>
        </div>
        {canManage && (
          <Button onClick={() => { setSelectedProduct(null); setProductForm({ unidade: 'unidade', ativo: true }); setFotoFile(null); setIsProductModalOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Novo Produto
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Ativos</p>
                <h3 className="text-2xl font-bold">{totalAtivos}</h3>
              </div>
              <Package className="h-8 w-8 text-primary/40" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Estoque Baixo</p>
                <h3 className="text-2xl font-bold text-amber-600">{baixoEstoque}</h3>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-500/40" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Esgotados</p>
                <h3 className="text-2xl font-bold text-red-600">{semEstoque}</h3>
              </div>
              <XCircle className="h-8 w-8 text-red-500/40" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-600">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Valor em Estoque</p>
                <h3 className="text-2xl font-bold">R$ {valorEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600/40" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/50 p-1 mb-4">
          <TabsTrigger value="produtos" className="gap-2"><Package className="h-4 w-4" /> Produtos</TabsTrigger>
          <TabsTrigger value="movimentacoes" className="gap-2"><History className="h-4 w-4" /> Movimentações</TabsTrigger>
          <TabsTrigger value="categorias" className="gap-2"><Tag className="h-4 w-4" /> Categorias</TabsTrigger>
        </TabsList>

        <TabsContent value="produtos" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar por nome ou marca..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-muted-foreground" /><SelectValue placeholder="Categoria" /></div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas Categorias</SelectItem>
                    {categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full border border-muted-foreground" /><SelectValue placeholder="Status" /></div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Status</SelectItem>
                    <SelectItem value="ok">Estoque OK</SelectItem>
                    <SelectItem value="baixo">Estoque Baixo</SelectItem>
                    <SelectItem value="esgotado">Esgotado</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => { setSearch(''); setFilterCategoria('todas'); setFilterStatus('todos'); }}>Limpar Filtros</Button>
              </div>
            </CardContent>
          </Card>

          {/* Product List */}
          <Card>
            <ScrollArea className="h-[500px]">
              <div className="p-0">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="table-header-premium">
                      <th className="p-4 rounded-tl-xl">Produto</th>
                      <th className="p-4">Marca / Categoria</th>
                      <th className="p-4 text-right">Preço Venda</th>
                      <th className="p-4 text-center">Estoque</th>
                      <th className="p-4 rounded-tr-xl text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loading ? (
                      <>
                        {[1, 2, 3, 4, 5].map(i => (
                          <tr key={i} className="animate-pulse">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="space-y-1">
                                  <Skeleton className="h-4 w-32" />
                                  <Skeleton className="h-2 w-20" />
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <Skeleton className="h-4 w-24 mb-1" />
                              <Skeleton className="h-4 w-16" />
                            </td>
                            <td className="p-4 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                            <td className="p-4 text-center"><Skeleton className="h-4 w-20 mx-auto" /></td>
                            <td className="p-4 text-center"><Skeleton className="h-8 w-16 mx-auto" /></td>
                          </tr>
                        ))}
                      </>
                    ) : filteredProdutos.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-0">
                          <EmptyState 
                            icon={Package}
                            title="Nenhum produto encontrado"
                            description={search ? `Não encontramos produtos para "${search}".` : "Seu estoque está vazio. Adicione seu primeiro produto para começar."}
                            action={!search && canManage && (
                              <Button onClick={() => { setSelectedProduct(null); setProductForm({ unidade: 'unidade', ativo: true }); setFotoFile(null); setIsProductModalOpen(true); }}>
                                <Plus className="mr-2 h-4 w-4" /> Novo Produto
                              </Button>
                            )}
                          />
                        </td>
                      </tr>
                    ) : filteredProdutos.map(p => (
                      <tr key={p.id} className="table-row-premium group transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                              {p.foto_url ? <img src={p.foto_url} alt="" className="h-full w-full object-cover" /> : <Package className="h-5 w-5 text-slate-400" />}
                            </div>
                            <div>
                              <p className="text-primary-vivid text-base">{p.nome}</p>
                              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-tight">Cód: {p.codigo_barras || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="text-slate-700 font-bold">{p.marca || '—'}</p>
                          <Badge variant="secondary" className="text-[9px] uppercase font-black bg-primary/5 text-primary border-primary/10 tracking-wider font-mono">{p.estoque_categorias?.nome}</Badge>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-primary-vivid font-black text-base">R$ {p.preco_venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </td>
                        <td className="p-4 text-center">
                          <div className={`inline-flex flex-col items-center px-3 py-1 rounded-lg border shadow-sm ${
                            p.estoque_atual <= (p.estoque_minimo || 0) 
                            ? 'bg-rose-50 border-rose-100 text-rose-700' 
                            : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                          }`}>
                            <span className="text-sm font-black leading-none">{p.estoque_atual}</span>
                            <span className="text-[9px] uppercase tracking-tighter font-bold">{p.unidade}</span>
                          </div>
                          {p.estoque_atual <= (p.estoque_minimo || 0) && (
                            <div className="mt-1">
                              <Badge className="badge-danger-vivid text-[8px] h-3 px-1">Baixo</Badge>
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {canStockIn && (
                              <Button 
                                variant="outline" 
                                size="icon" 
                                onClick={() => { setSelectedProduct(p); setIsStockInModalOpen(true); }} 
                                className="h-9 w-9 rounded-full border-emerald-200 hover:bg-emerald-50 text-emerald-600" 
                                title="Entrada de Estoque"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            )}
                            {canManage && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-9 w-9 text-blue-500 hover:bg-blue-50 rounded-full"
                                  onClick={() => { setSelectedProduct(p); setProductForm({ ...p }); setIsProductModalOpen(true); }}
                                  title="Editar Produto"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-9 w-9 text-red-500 hover:bg-red-50 rounded-full"
                                  onClick={() => { setSelectedProduct(p); /* Removida chamada inexistente */ }}
                                  title="Excluir Produto"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="movimentacoes" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar por produto/motivo..." value={movSearch} onChange={e => setMovSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={movType} onValueChange={setMovType}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-muted-foreground" /><SelectValue placeholder="Tipo" /></div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Tipos</SelectItem>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                    <SelectItem value="venda">Venda</SelectItem>
                    <SelectItem value="ajuste">Ajuste de Inventário</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={movPeriod} onValueChange={setMovPeriod}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2"><History className="h-4 w-4 text-muted-foreground" /><SelectValue placeholder="Período" /></div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todo o Período</SelectItem>
                    <SelectItem value="hoje">Hoje</SelectItem>
                    <SelectItem value="mes">Este Mês</SelectItem>
                    <SelectItem value="ano">Este Ano</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => { setMovSearch(''); setMovType('todos'); setMovPeriod('todos'); }}>Limpar Filtros</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <ScrollArea className="h-[600px]">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-muted/50 sticky top-0 z-10">
                  <tr>
                    <th className="p-4 font-semibold">Data/Hora</th>
                    <th className="p-4 font-semibold">Produto</th>
                    <th className="p-4 font-semibold">Tipo</th>
                    <th className="p-4 font-semibold text-right">Qtd</th>
                    <th className="p-4 font-semibold text-right">Anterior</th>
                    <th className="p-4 font-semibold text-right">Atual</th>
                    <th className="p-4 font-semibold">Motivo</th>
                    <th className="p-4 font-semibold">Registrado por</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                   {loading ? (
                    <>
                      {[1, 2, 3, 4, 5].map(i => (
                        <tr key={i} className="animate-pulse">
                          <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                          <td className="p-4">
                            <Skeleton className="h-4 w-40 mb-1" />
                            <Skeleton className="h-2 w-20" />
                          </td>
                          <td className="p-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
                          <td className="p-4 text-right"><Skeleton className="h-4 w-12 ml-auto" /></td>
                          <td className="p-4 text-right"><Skeleton className="h-4 w-12 ml-auto" /></td>
                          <td className="p-4"><Skeleton className="h-4 w-32" /></td>
                          <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                        </tr>
                      ))}
                    </>
                  ) : filteredMovimentacoes.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-0">
                        <EmptyState 
                          icon={History}
                          title="Nenhuma movimentação"
                          description={movSearch ? "Nenhuma movimentação encontrada com esses filtros." : "O histórico de movimentações aparecerá aqui assim que houver entradas ou saídas."}
                        />
                      </td>
                    </tr>
                  ) : filteredMovimentacoes.map(m => (
                    <tr key={m.id} className="hover:bg-muted/30">
                      <td className="p-4 text-muted-foreground">
                        {format(new Date(m.criado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </td>
                      <td className="p-4">
                        <p className="font-medium text-foreground">{m.estoque_produtos?.nome}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{m.estoque_produtos?.marca}</p>
                      </td>
                      <td className="p-4">
                        {m.tipo === 'entrada' ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-none">Entrada</Badge>
                        ) : m.tipo === 'saida' ? (
                          <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-none">Saída</Badge>
                        ) : m.tipo === 'venda' ? (
                          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-none">Venda</Badge>
                        ) : (
                          <Badge variant="outline" className="capitalize">{m.tipo}</Badge>
                        )}
                      </td>
                      <td className={`p-4 text-right font-bold ${m.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                        {m.tipo === 'entrada' ? '+' : '-'}{m.quantidade}
                      </td>
                      <td className="p-4 text-right text-muted-foreground">{m.quantidade_anterior}</td>
                      <td className="p-4 text-right font-bold text-foreground">{m.quantidade_atual}</td>
                      <td className="p-4 text-muted-foreground">{m.motivo}</td>
                      <td className="p-4 text-muted-foreground font-medium">{m.usuarios?.nome || 'Sistema'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="categorias">
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setSelectedCategory(null); setCategoryForm({ nome: '', descricao: '', ativo: true }); setIsCategoryModalOpen(true); }} size="sm">
              <Plus className="mr-2 h-4 w-4" /> Nova Categoria
            </Button>
          </div>
          <Card>
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-4 font-semibold">Nome</th>
                  <th className="p-4 font-semibold">Descrição</th>
                  <th className="p-4 font-semibold text-center">Status</th>
                  <th className="p-4 font-semibold text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {categorias.map(c => (
                  <tr key={c.id} className="hover:bg-muted/30">
                    <td className="p-4 font-medium text-foreground">{c.nome}</td>
                    <td className="p-4 text-muted-foreground">{c.descricao || '—'}</td>
                    <td className="p-4 text-center">
                      <Badge variant={c.ativo ? 'default' : 'secondary'}>{c.ativo ? 'Ativo' : 'Inativo'}</Badge>
                    </td>
                    <td className="p-4 text-center">
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedCategory(c); setCategoryForm(c); setIsCategoryModalOpen(true); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Product Modal */}
      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="bg-primary p-6">
            <DialogTitle className="flex items-center gap-2 text-white text-xl">
              <Package className="w-6 h-6" />
              {selectedProduct ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
            <p className="text-primary-foreground/80 text-sm mt-1">
              Preencha os dados do produto para manter o estoque organizado.
            </p>
          </DialogHeader>
          <div className="max-h-[75vh] overflow-y-auto bg-slate-50/50">
            <div className="p-6 space-y-6">
              
              {/* FOTO E INFORMAÇÕES BÁSICAS */}
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex justify-center mb-6">
                  <ImageUpload
                    value={productForm.foto_url}
                    onChange={(file) => setFotoFile(file)}
                    onRemove={() => {
                      setFotoFile(null);
                      setProductForm({ ...productForm, foto_url: '' });
                    }}
                    shape="square"
                    size="lg"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 focus-within:text-primary transition-colors col-span-2 md:col-span-1">
                    <Label className="font-semibold">Nome do Produto *</Label>
                    <Input className="bg-slate-50" value={productForm.nome || ''} onChange={e => setProductForm({...productForm, nome: e.target.value})} />
                  </div>
                  <div className="space-y-1.5 focus-within:text-primary transition-colors col-span-2 md:col-span-1">
                    <Label className="font-semibold">Categoria *</Label>
                    <Select value={productForm.categoria_id} onValueChange={val => setProductForm({...productForm, categoria_id: val})}>
                      <SelectTrigger className="bg-slate-50"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {categorias.filter(c => c.ativo).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 focus-within:text-primary transition-colors col-span-2 md:col-span-1">
                    <Label className="font-semibold">Marca</Label>
                    <Input className="bg-slate-50" value={productForm.marca || ''} onChange={e => setProductForm({...productForm, marca: e.target.value})} />
                  </div>
                  <div className="space-y-1.5 focus-within:text-primary transition-colors col-span-2 md:col-span-1">
                    <Label className="font-semibold">Unidade</Label>
                    <Select value={productForm.unidade} onValueChange={val => setProductForm({...productForm, unidade: val})}>
                      <SelectTrigger className="bg-slate-50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {unidades.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* VALORES E ESTOQUE */}
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
                <h3 className="font-semibold text-primary mb-2 text-sm uppercase tracking-wider">Valores e Estoque</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 focus-within:text-primary transition-colors">
                    <Label className="font-semibold">Preço de Custo</Label>
                    <Input className="bg-slate-50" type="number" step="0.01" value={productForm.preco_custo || ''} onChange={e => setProductForm({...productForm, preco_custo: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-1.5 focus-within:text-primary transition-colors">
                    <Label className="font-semibold">Preço de Venda</Label>
                    <Input className="bg-slate-50" type="number" step="0.01" value={productForm.preco_venda || ''} onChange={e => setProductForm({...productForm, preco_venda: Number(e.target.value)})} />
                  </div>
                  {!selectedProduct && (
                    <div className="space-y-1.5 focus-within:text-primary transition-colors">
                      <Label className="font-semibold">Estoque Inicial</Label>
                      <Input className="bg-slate-50" type="number" value={productForm.estoque_atual || ''} onChange={e => setProductForm({...productForm, estoque_atual: Number(e.target.value)})} />
                    </div>
                  )}
                  <div className="space-y-1.5 focus-within:text-primary transition-colors">
                    <Label className="font-semibold">Estoque Mínimo</Label>
                    <Input className="bg-slate-50" type="number" value={productForm.estoque_minimo || ''} onChange={e => setProductForm({...productForm, estoque_minimo: Number(e.target.value)})} />
                  </div>
                </div>
              </div>

              {/* OUTRAS INFORMAÇÕES */}
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
                <div className="space-y-1.5 focus-within:text-primary transition-colors">
                  <Label className="font-semibold">Código de Barras</Label>
                  <Input className="bg-slate-50" value={productForm.codigo_barras || ''} onChange={e => setProductForm({...productForm, codigo_barras: e.target.value})} />
                </div>
                <div className="space-y-1.5 focus-within:text-primary transition-colors">
                  <Label className="font-semibold">Descrição</Label>
                  <Input className="bg-slate-50" value={productForm.descricao || ''} onChange={e => setProductForm({...productForm, descricao: e.target.value})} />
                </div>
              </div>

            </div>
            
            <div className="p-6 bg-slate-50 border-t flex flex-col sm:flex-row justify-end gap-3">
               <Button variant="outline" className="h-12 px-6 rounded-xl" onClick={() => { setIsProductModalOpen(false); setFotoFile(null); }}>Cancelar</Button>
               <Button className="h-12 px-6 rounded-xl shadow-md" onClick={handleSaveProduct}>Salvar Produto</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stock In Modal */}
      <Dialog open={isStockInModalOpen} onOpenChange={setIsStockInModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="bg-green-600 p-6">
            <DialogTitle className="flex items-center gap-2 text-white text-xl">
              <TrendingUp className="w-6 h-6" />
              Entrada de Estoque
            </DialogTitle>
            <p className="text-green-50 text-sm mt-1">Adicione unidades ao estoque do produto {selectedProduct?.nome}.</p>
          </DialogHeader>
          <div className="max-h-[80vh] overflow-y-auto">
            <div className="p-6 space-y-6 bg-slate-50/50">
              <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm space-y-2">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-muted-foreground font-semibold">Estoque Atual:</span>
                  <span className="font-bold text-lg">{selectedProduct?.estoque_atual} {selectedProduct?.unidade}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-muted-foreground font-semibold">Preço de Custo:</span>
                  <span className="font-bold text-slate-700">R$ {selectedProduct?.preco_custo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
                <div className="space-y-1.5 focus-within:text-green-600 transition-colors">
                  <Label className="font-semibold">Quantidade a Adicionar</Label>
                  <Input className="bg-slate-50 text-lg h-12" type="number" min="1" value={stockInForm.quantidade || ''} onChange={e => setStockInForm({...stockInForm, quantidade: Number(e.target.value)})} />
                </div>
                <div className="space-y-1.5 focus-within:text-green-600 transition-colors">
                  <Label className="font-semibold">Motivo</Label>
                  <Select value={stockInForm.motivo} onValueChange={val => setStockInForm({...stockInForm, motivo: val})}>
                    <SelectTrigger className="bg-slate-50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Compra">Compra / Reposição</SelectItem>
                      <SelectItem value="Doação">Recebido p/ Doação</SelectItem>
                      <SelectItem value="Ajuste de Inventário">Ajuste de Inventário (Sobra)</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button variant="outline" className="h-12 rounded-xl" onClick={() => setIsStockInModalOpen(false)}>Cancelar</Button>
                <Button onClick={handleStockIn} className="h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-md">Confirmar</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Category Modal */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="bg-primary p-6">
            <DialogTitle className="flex items-center gap-2 text-white text-xl">
              <Tag className="w-6 h-6" />
              {selectedCategory ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
            <p className="text-primary-foreground/80 text-sm mt-1">Organize os produtos por categoria.</p>
          </DialogHeader>
          <div className="max-h-[80vh] overflow-y-auto">
            <div className="p-6 space-y-6 bg-slate-50/50">
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
                <div className="space-y-1.5 focus-within:text-primary transition-colors">
                  <Label className="font-semibold">Nome da Categoria</Label>
                  <Input className="bg-slate-50" value={categoryForm.nome || ''} onChange={e => setCategoryForm({...categoryForm, nome: e.target.value})} />
                </div>
                <div className="space-y-1.5 focus-within:text-primary transition-colors">
                  <Label className="font-semibold">Descrição</Label>
                  <Input className="bg-slate-50" value={categoryForm.descricao || ''} onChange={e => setCategoryForm({...categoryForm, descricao: e.target.value})} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button variant="outline" className="h-12 rounded-xl" onClick={() => setIsCategoryModalOpen(false)}>Cancelar</Button>
                <Button onClick={handleSaveCategory} className="h-12 rounded-xl shadow-md">Salvar</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
