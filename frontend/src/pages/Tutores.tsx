import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Users, Pencil, Trash2 } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Tutor {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  whatsapp: string;
  email: string;
  endereco: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  observacoes: string;
}

const emptyForm = { 
  nome: '', 
  cpf: '', 
  telefone: '', 
  whatsapp: '', 
  email: '', 
  endereco: '',
  bairro: '',
  cidade: '', 
  estado: '',
  cep: '',
  observacoes: ''
};

const formatCPF = (value: string) => {
  const cpf = value.replace(/\D/g, '');
  return cpf
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

const formatPhone = (value: string) => {
  const phone = value.replace(/\D/g, '');
  if (phone.length <= 10) {
    return phone
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  }
  return phone
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

const formatCEP = (value: string) => {
  const cep = value.replace(/\D/g, '');
  return cep
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1');
};

const estadosBR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export default function Tutores() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tutores, setTutores] = useState<Tutor[]>([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<Omit<Tutor, 'id'>>(emptyForm);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchTutores = async () => {
    setLoading(true);
    try {
      let query = supabase.from('tutores').select('*').order('nome');
      if (search) query = query.ilike('nome', `%${search}%`);
      const { data } = await query;
      setTutores(data ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTutores(); }, [search]);

  useEffect(() => {
    const term = searchParams.get('search');
    if (term) {
      setSearch(term);
      // Limpa para não prender o filtro se o usuário apagar manualmente
      searchParams.delete('search');
      setSearchParams(searchParams);
    }

    const editId = searchParams.get('edit');
    if (editId && tutores.length > 0) {
      const tutor = tutores.find(t => t.id === editId);
      if (tutor) {
        handleEdit(tutor);
        searchParams.delete('edit');
        setSearchParams(searchParams);
      }
    }
  }, [searchParams, tutores]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    if (editingId) {
      const { error } = await supabase.from('tutores').update(form).eq('id', editingId);
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Tutor atualizado com sucesso!' });
        setForm(emptyForm);
        setEditingId(null);
        setOpen(false);
        fetchTutores();
      }
    } else {
      const { error } = await supabase.from('tutores').insert([form]);
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Tutor cadastrado com sucesso!' });
        setForm(emptyForm);
        setOpen(false);
        fetchTutores();
      }
    }
    setLoading(false);
  };

  const handleEdit = (tutor: Tutor) => {
    setForm({
      nome: tutor.nome || '',
      cpf: tutor.cpf || '',
      telefone: tutor.telefone || '',
      whatsapp: tutor.whatsapp || '',
      email: tutor.email || '',
      endereco: tutor.endereco || '',
      bairro: tutor.bairro || '',
      cidade: tutor.cidade || '',
      estado: tutor.estado || '',
      cep: tutor.cep || '',
      observacoes: tutor.observacoes || '',
    });
    setEditingId(tutor.id);
    setOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    const { error } = await supabase.from('tutores').delete().eq('id', deleteId);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Tutor excluído com sucesso!' });
      fetchTutores();
    }
    setDeleteId(null);
  };



  const handleCEPBlur = async () => {
    const cep = form.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setForm(prev => ({
          ...prev,
          endereco: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          estado: data.uf || ''
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tutores</h1>
          <p className="text-muted-foreground text-sm">Gerencie os tutores cadastrados</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setForm(emptyForm);
            setEditingId(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Novo Tutor</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl">
            <DialogHeader className="bg-primary p-6">
              <DialogTitle className="flex items-center gap-2 text-white text-xl">
                <Users className="w-6 h-6" />
                {editingId ? 'Editar Tutor' : 'Cadastrar Tutor'}
              </DialogTitle>
              <p className="text-primary-foreground/80 text-sm mt-1">
                Preencha as informações do tutor abaixo para manter o cadastro atualizado.
              </p>
            </DialogHeader>
            <div className="max-h-[75vh] overflow-y-auto">
              <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-slate-50/50">
                
                {/* DADOS PRINCIPAIS */}
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
                  <h3 className="font-semibold text-primary mb-2 text-sm uppercase tracking-wider">Dados Pessoais</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2 space-y-1.5 focus-within:text-primary transition-colors">
                      <Label className="font-semibold">Nome (obrigatório)</Label>
                      <Input 
                        value={form.nome} 
                        onChange={(e) => setForm({ ...form, nome: e.target.value })} 
                        placeholder="Nome completo"
                        className="bg-slate-50"
                        required 
                      />
                    </div>
                    
                    <div className="space-y-1.5 focus-within:text-primary transition-colors">
                      <Label className="font-semibold">CPF</Label>
                      <Input 
                        value={form.cpf} 
                        onChange={(e) => setForm({ ...form, cpf: formatCPF(e.target.value) })} 
                        placeholder="000.000.000-00"
                        className="bg-slate-50"
                        maxLength={14}
                      />
                    </div>

                    <div className="space-y-1.5 focus-within:text-primary transition-colors">
                      <Label className="font-semibold">Telefone (obrigatório)</Label>
                      <Input 
                        value={form.telefone} 
                        onChange={(e) => setForm({ ...form, telefone: formatPhone(e.target.value) })} 
                        placeholder="(00) 00000-0000"
                        className="bg-slate-50"
                        maxLength={15}
                        required 
                      />
                    </div>

                    <div className="space-y-1.5 focus-within:text-primary transition-colors">
                      <Label className="font-semibold">WhatsApp</Label>
                      <Input 
                        value={form.whatsapp} 
                        onChange={(e) => setForm({ ...form, whatsapp: formatPhone(e.target.value) })} 
                        placeholder="(00) 00000-0000"
                        className="bg-slate-50"
                        maxLength={15}
                      />
                    </div>

                    <div className="space-y-1.5 focus-within:text-primary transition-colors">
                      <Label className="font-semibold">E-mail</Label>
                      <Input 
                        type="email"
                        value={form.email} 
                        onChange={(e) => setForm({ ...form, email: e.target.value })} 
                        placeholder="exemplo@email.com"
                        className="bg-slate-50"
                      />
                    </div>
                  </div>
                </div>

                {/* ENDEREÇO */}
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
                  <h3 className="font-semibold text-primary mb-2 text-sm uppercase tracking-wider">Endereço</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 focus-within:text-primary transition-colors">
                      <Label className="font-semibold">CEP</Label>
                      <Input 
                        value={form.cep} 
                        onChange={(e) => setForm({ ...form, cep: formatCEP(e.target.value) })} 
                        onBlur={handleCEPBlur}
                        placeholder="00.000-000"
                        className="bg-slate-50"
                        maxLength={10}
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-2 focus-within:text-primary transition-colors">
                      <Label className="font-semibold">Endereço</Label>
                      <Input 
                        value={form.endereco} 
                        onChange={(e) => setForm({ ...form, endereco: e.target.value })} 
                        placeholder="Rua, número..."
                        className="bg-slate-50"
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-2 focus-within:text-primary transition-colors">
                      <Label className="font-semibold">Bairro</Label>
                      <Input 
                        value={form.bairro} 
                        onChange={(e) => setForm({ ...form, bairro: e.target.value })} 
                        placeholder="Bairro"
                        className="bg-slate-50"
                      />
                    </div>

                    <div className="space-y-1.5 focus-within:text-primary transition-colors">
                      <Label className="font-semibold">Cidade</Label>
                      <Input 
                        value={form.cidade} 
                        onChange={(e) => setForm({ ...form, cidade: e.target.value })} 
                        placeholder="Cidade"
                        className="bg-slate-50"
                      />
                    </div>

                    <div className="space-y-1.5 focus-within:text-primary transition-colors">
                      <Label className="font-semibold">Estado</Label>
                      <Select
                        value={form.estado}
                        onValueChange={(v) => setForm({ ...form, estado: v })}
                      >
                        <SelectTrigger className="bg-slate-50">
                          <SelectValue placeholder="Selecione o estado" />
                        </SelectTrigger>
                        <SelectContent>
                          {estadosBR.map((uf) => (
                            <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* OBSERVAÇÕES */}
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
                  <div className="space-y-1.5 focus-within:text-primary transition-colors">
                    <Label className="font-semibold">Observações Iniciais</Label>
                    <Textarea 
                      value={form.observacoes} 
                      onChange={(e) => setForm({ ...form, observacoes: e.target.value })} 
                      placeholder="Informações adicionais..."
                      className="min-h-[100px] bg-slate-50 resize-none"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button type="submit" className="w-full text-lg h-12 rounded-xl shadow-md hover:shadow-lg transition-all" disabled={loading}>
                    {editingId ? 'Salvar Alterações' : 'Confirmar Cadastro'}
                  </Button>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg animate-pulse">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : tutores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="h-10 w-10 mb-2" />
              <p>Nenhum tutor encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Bairro</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tutores.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.nome}</TableCell>
                    <TableCell>{t.cpf}</TableCell>
                    <TableCell>{t.telefone}</TableCell>
                    <TableCell>{t.bairro}</TableCell>
                    <TableCell>{t.cidade}</TableCell>
                    <TableCell>{t.estado}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(t)}
                          className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(t.id)}
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir este tutor?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os dados do tutor serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
