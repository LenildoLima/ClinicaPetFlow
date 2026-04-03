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
  
  // Filtros
  const [search, setSearch] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('todas');
  const [filterStatus, setFilterStatus] = useState('todos');

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
          .limit(50)
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
    const matchesCat = filterCategoria === 'todas' || p.categoria_id === filterCategoria;
    const matchesStatus = 
      filterStatus === 'todos' || 
      (filterStatus === 'baixo' && p.estoque_atual <= p.estoque_minimo && p.estoque_atual > 0) ||
      (filterStatus === 'esgotado' && p.estoque_atual === 0);
    
    return matchesSearch && matchesCat && matchesStatus;
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
                  <thead className="bg-muted/50 sticky top-0 z-10">
                    <tr>
                      <th className="p-4 font-semibold">Produto</th>
                      <th className="p-4 font-semibold">Marca / Categoria</th>
                      <th className="p-4 font-semibold text-right">Preço Venda</th>
                      <th className="p-4 font-semibold text-center">Estoque</th>
                      <th className="p-4 font-semibold text-center">Ações</th>
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
                      <tr><td colSpan={5} className="p-12 text-center text-muted-foreground italic">Nenhum produto encontrado.</td></tr>
                    ) : filteredProdutos.map(p => (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden border">
                              {p.foto_url ? <img src={p.foto_url} alt="" className="h-full w-full object-cover" /> : <Package className="h-5 w-5 text-muted-foreground" />}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{p.nome}</p>
                              <p className="text-xs text-muted-foreground">Cód: {p.codigo_barras || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="text-foreground">{p.marca || '—'}</p>
                          <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-tight">{p.estoque_categorias?.nome}</Badge>
                        </td>
                        <td className="p-4 text-right font-medium">R$ {p.preco_venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="p-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-bold">{p.estoque_atual} {p.unidade}</span>
                            {p.estoque_atual === 0 ? (
                              <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-none px-2 shadow-none">Esgotado</Badge>
                            ) : p.estoque_atual <= p.estoque_minimo ? (
                              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none px-2 shadow-none">Baixo</Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-none px-2 shadow-none">OK</Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            {canStockIn && (
                              <Button variant="outline" size="sm" onClick={() => { setSelectedProduct(p); setIsStockInModalOpen(true); }} className="h-8 w-8 p-0" title="Entrada">
                                <Plus className="h-4 w-4" />
                              </Button>
                            )}
                            {canManage && (
                              <Button variant="ghost" size="sm" onClick={() => { setSelectedProduct(p); setProductForm(p); setIsProductModalOpen(true); }} className="h-8 w-8 p-0">
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredProdutos.length === 0 && (
                      <tr><td colSpan={5} className="p-12 text-center text-muted-foreground">Nenhum produto encontrado.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="movimentacoes">
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
                  ) : movimentacoes.length === 0 ? (
                    <tr><td colSpan={8} className="p-12 text-center text-muted-foreground italic">Nenhuma movimentação registrada.</td></tr>
                  ) : movimentacoes.map(m => (
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
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 flex justify-center mb-4">
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
            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label>Nome do Produto *</Label>
              <Input value={productForm.nome} onChange={e => setProductForm({...productForm, nome: e.target.value})} />
            </div>
            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label>Categoria *</Label>
              <Select value={productForm.categoria_id} onValueChange={val => setProductForm({...productForm, categoria_id: val})}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {categorias.filter(c => c.ativo).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Marca</Label>
              <Input value={productForm.marca} onChange={e => setProductForm({...productForm, marca: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Unidade</Label>
              <Select value={productForm.unidade} onValueChange={val => setProductForm({...productForm, unidade: val})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {unidades.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Preço de Custo</Label>
              <Input type="number" step="0.01" value={productForm.preco_custo} onChange={e => setProductForm({...productForm, preco_custo: Number(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <Label>Preço de Venda</Label>
              <Input type="number" step="0.01" value={productForm.preco_venda} onChange={e => setProductForm({...productForm, preco_venda: Number(e.target.value)})} />
            </div>
            {!selectedProduct && (
              <div className="space-y-2">
                <Label>Estoque Inicial</Label>
                <Input type="number" value={productForm.estoque_atual} onChange={e => setProductForm({...productForm, estoque_atual: Number(e.target.value)})} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Estoque Mínimo</Label>
              <Input type="number" value={productForm.estoque_minimo} onChange={e => setProductForm({...productForm, estoque_minimo: Number(e.target.value)})} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Código de Barras</Label>
              <Input value={productForm.codigo_barras} onChange={e => setProductForm({...productForm, codigo_barras: e.target.value})} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Descrição</Label>
              <Input value={productForm.descricao} onChange={e => setProductForm({...productForm, descricao: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsProductModalOpen(false); setFotoFile(null); }}>Cancelar</Button>
            <Button onClick={handleSaveProduct}>Salvar Produto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock In Modal */}
      <Dialog open={isStockInModalOpen} onOpenChange={setIsStockInModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Entrada de Estoque</DialogTitle>
            <DialogDescription>Adicione unidades ao estoque do produto {selectedProduct?.nome}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted/30 rounded-md border text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-muted-foreground">Estoque Atual:</span>
                <span className="font-bold">{selectedProduct?.estoque_atual} {selectedProduct?.unidade}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Preço de Custo:</span>
                <span className="font-bold">R$ {selectedProduct?.preco_custo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Quantidade a Adicionar</Label>
              <Input type="number" min="1" value={stockInForm.quantidade} onChange={e => setStockInForm({...stockInForm, quantidade: Number(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Select value={stockInForm.motivo} onValueChange={val => setStockInForm({...stockInForm, motivo: val})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Compra">Compra / Reposição</SelectItem>
                  <SelectItem value="Doação">Recebido p/ Doação</SelectItem>
                  <SelectItem value="Ajuste de Inventário">Ajuste de Inventário (Sobra)</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStockInModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleStockIn} className="bg-green-600 hover:bg-green-700">Confirmar Entrada</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Modal */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedCategory ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Categoria</Label>
              <Input value={categoryForm.nome} onChange={e => setCategoryForm({...categoryForm, nome: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={categoryForm.descricao} onChange={e => setCategoryForm({...categoryForm, descricao: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveCategory}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
