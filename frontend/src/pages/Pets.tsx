import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Heart, Pencil, Trash2, History, Dog, Cat, Mouse, Bird, Bug, HelpCircle } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/EmptyState';
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

interface Tutor { id: string; nome: string }
interface Pet {
  id: string;
  nome: string;
  especie: string;
  raca: string;
  sexo: string;
  data_nascimento: string;
  castrado: boolean;
  observacoes: string;
  tutor_id: string;
  tutores: { nome: string } | null;
}

const emptyForm = { 
  nome: '', 
  especie: '', 
  raca: '', 
  sexo: '', 
  data_nascimento: '', 
  castrado: false, 
  observacoes: '',
  tutor_id: '' 
};

const especieLabels: Record<string, string> = {
  cao: 'Cão/Cachorro',
  gato: 'Gato',
  passaro: 'Pássaro',
  roedor: 'Roedor',
  reptil: 'Réptil',
  outro: 'Outro',
};

const sexoLabels: Record<string, string> = {
  macho: 'Macho',
  femea: 'Fêmea',
  nao_informado: 'Não Informado',
};

export default function Pets() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [pets, setPets] = useState<Pet[]>([]);
  const [tutores, setTutores] = useState<Tutor[]>([]);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [tutorSearch, setTutorSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPets = async (ignore = false) => {
    setLoading(true);
    try {
      let query = supabase.from('pets').select('*, tutores(nome)').order('nome');
      if (search.trim()) {
        query = query.ilike('nome', `%${search.trim()}%`);
      }
      const { data } = await query;
      if (!ignore) setPets((data as unknown as Pet[]) ?? []);
    } finally {
      if (!ignore) setLoading(false);
    }
  };

  const fetchTutores = async () => {
    let query = supabase.from('tutores').select('id, nome').order('nome');
    if (tutorSearch) query = query.ilike('nome', `%${tutorSearch}%`);
    const { data } = await query;
    setTutores(data ?? []);
  };

  useEffect(() => { 
    let ignore = false;
    fetchPets(ignore); 
    return () => { ignore = true; };
  }, [search]);

  useEffect(() => {
    const term = searchParams.get('search');
    if (term && term !== search) {
      setSearch(term);
    }

    const editId = searchParams.get('edit');
    if (editId && pets.length > 0) {
      const pet = pets.find(p => p.id === editId);
      if (pet) {
        handleEdit(pet);
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('edit');
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [searchParams, pets.length]);
  useEffect(() => { fetchTutores(); }, [tutorSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const payload = {
      nome: form.nome,
      especie: form.especie,
      raca: form.raca,
      sexo: form.sexo,
      data_nascimento: form.data_nascimento || null,
      castrado: form.castrado,
      observacoes: form.observacoes || '',
      tutor_id: form.tutor_id || null,
    };

    if (editingId) {
      const { error } = await supabase.from('pets').update(payload).eq('id', editingId);
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Pet atualizado com sucesso!' });
        setForm(emptyForm);
        setEditingId(null);
        setOpen(false);
        fetchPets();
      }
    } else {
      const { error } = await supabase.from('pets').insert([payload]);
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Pet cadastrado com sucesso!' });
        setForm(emptyForm);
        setOpen(false);
        fetchPets();
      }
    }
    setLoading(false);
  };

  const handleEdit = (pet: Pet) => {
    setForm({
      nome: pet.nome || '',
      especie: pet.especie || '',
      raca: pet.raca || '',
      sexo: pet.sexo || '',
      data_nascimento: pet.data_nascimento || '',
      castrado: pet.castrado || false,
      observacoes: pet.observacoes || '',
      tutor_id: pet.tutor_id || '',
    });
    setEditingId(pet.id);
    setOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    const { error } = await supabase.from('pets').delete().eq('id', deleteId);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Pet excluído com sucesso!' });
      fetchPets();
    }
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pets</h1>
          <p className="text-muted-foreground text-sm">Gerencie os pets cadastrados</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setForm(emptyForm);
            setEditingId(null);
            setTutorSearch('');
          }
        }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Novo Pet</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl p-0 overflow-hidden border-none shadow-2xl">
            <DialogHeader className="bg-primary p-6">
              <DialogTitle className="flex items-center gap-2 text-white text-xl">
                <Heart className="w-6 h-6" />
                {editingId ? 'Editar Pet' : 'Cadastrar Pet'}
              </DialogTitle>
              <p className="text-primary-foreground/80 text-sm mt-1">
                Preencha os dados abaixo para manter a ficha do animalzinho atualizada.
              </p>
            </DialogHeader>
            <div className="max-h-[75vh] overflow-y-auto">
              <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-slate-50/50">
                
                {/* DADOS PRINCIPAIS DO PET */}
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
                  <h3 className="font-semibold text-primary mb-2 text-sm uppercase tracking-wider">Identificação do Pet</h3>
                  
                  <div className="space-y-1.5 focus-within:text-primary transition-colors">
                    <Label className="font-semibold">Nome</Label>
                    <Input 
                      value={form.nome} 
                      onChange={(e) => setForm({ ...form, nome: e.target.value })} 
                      className="bg-slate-50"
                      required 
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 focus-within:text-primary transition-colors">
                      <Label className="font-semibold">Espécie</Label>
                      <Select value={form.especie} onValueChange={(v) => setForm({ ...form, especie: v })}>
                        <SelectTrigger className="bg-slate-50"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cao">Cão/Cachorro</SelectItem>
                          <SelectItem value="gato">Gato</SelectItem>
                          <SelectItem value="passaro">Pássaro</SelectItem>
                          <SelectItem value="roedor">Roedor</SelectItem>
                          <SelectItem value="reptil">Réptil</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5 focus-within:text-primary transition-colors">
                      <Label className="font-semibold">Raça</Label>
                      <Input 
                        value={form.raca} 
                        onChange={(e) => setForm({ ...form, raca: e.target.value })} 
                        className="bg-slate-50"
                      />
                    </div>

                    <div className="space-y-1.5 focus-within:text-primary transition-colors">
                      <Label className="font-semibold">Sexo</Label>
                      <Select value={form.sexo} onValueChange={(v) => setForm({ ...form, sexo: v })}>
                        <SelectTrigger className="bg-slate-50"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="macho">Macho</SelectItem>
                          <SelectItem value="femea">Fêmea</SelectItem>
                          <SelectItem value="nao_informado">Não Informado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5 focus-within:text-primary transition-colors">
                      <Label className="font-semibold">Data de Nascimento</Label>
                      <Input 
                        type="date" 
                        value={form.data_nascimento} 
                        onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })} 
                        className="bg-slate-50"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Checkbox
                      id="castrado"
                      checked={form.castrado}
                      onCheckedChange={(v) => setForm({ ...form, castrado: v === true })}
                    />
                    <Label htmlFor="castrado" className="font-medium cursor-pointer">Pet Castrado?</Label>
                  </div>
                </div>

                {/* VINCULAÇÃO E OBSERVAÇÕES */}
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
                  <h3 className="font-semibold text-primary mb-2 text-sm uppercase tracking-wider">Tutor e Histórico</h3>
                  
                  <div className="space-y-1.5 focus-within:text-primary transition-colors">
                    <Label className="font-semibold">Tutor Responsável</Label>
                    {editingId ? (
                       <Input value={pets.find(p => p.id === editingId)?.tutores?.nome || '—'} className="bg-slate-50" disabled />
                    ) : (
                      <>
                        <Input
                          placeholder="Buscar tutor por nome..."
                          value={tutorSearch}
                          onChange={(e) => setTutorSearch(e.target.value)}
                          className="mb-2 bg-slate-50"
                        />
                        <Select value={form.tutor_id} onValueChange={(v) => setForm({ ...form, tutor_id: v })}>
                          <SelectTrigger className="bg-slate-50"><SelectValue placeholder="Selecione o tutor da lista" /></SelectTrigger>
                          <SelectContent>
                            {tutores.map((t) => (
                              <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>

                  <div className="space-y-1.5 focus-within:text-primary transition-colors">
                    <Label className="font-semibold">Observações Iniciais</Label>
                    <Input 
                      value={form.observacoes} 
                      onChange={(e) => setForm({ ...form, observacoes: e.target.value })} 
                      placeholder="Alguma particularidade?"
                      className="bg-slate-50"
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
            <Input placeholder="Buscar por nome..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
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
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : pets.length === 0 ? (
            <EmptyState 
              icon={Heart}
              title="Nenhum pet encontrado"
              description={search ? `Não encontramos pets com o nome "${search}". Tente buscar por outro nome.` : "Não há pets cadastrados. Que tal adicionar o primeiro agora?"}
              action={!search && (
                <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Novo Pet</Button>
              )}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="table-header-premium">
                  <TableHead className="rounded-tl-xl px-4">Pet</TableHead>
                  <TableHead className="px-4">Espécie / Raça</TableHead>
                  <TableHead className="px-4">Sexo</TableHead>
                  <TableHead className="px-4">Tutor</TableHead>
                  <TableHead className="px-4">Status</TableHead>
                  <TableHead className="rounded-tr-xl px-4 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pets.map((p) => (
                  <TableRow key={p.id} className="table-row-premium group">
                    <TableCell className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          {p.especie === 'cao' ? <Dog className="w-5 h-5" /> : 
                           p.especie === 'gato' ? <Cat className="w-5 h-5" /> : 
                           <Heart className="w-5 h-5" />}
                        </div>
                        <button 
                          onClick={() => navigate(`/pets/${p.id}`)}
                          className="text-left hover:opacity-80 transition-opacity"
                        >
                          <div className="text-primary-vivid text-base capitalize">{p.nome}</div>
                          <div className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">Paciente Ativo</div>
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="px-4">
                      <div className="text-secondary-vivid font-bold text-xs">{especieLabels[p.especie] || p.especie}</div>
                      <div className="text-[11px] text-slate-400">{p.raca || 'Sem raça definida'}</div>
                    </TableCell>
                    <TableCell className="px-4">
                      <Badge variant="outline" className={`bg-slate-50 border-slate-200 text-slate-600 font-bold ${p.sexo === 'macho' ? 'border-blue-200 text-blue-700 bg-blue-50' : p.sexo === 'femea' ? 'border-pink-200 text-pink-700 bg-pink-50' : ''}`}>
                        {sexoLabels[p.sexo] || p.sexo}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4">
                      <div className="text-secondary-vivid font-medium">{p.tutores?.nome}</div>
                    </TableCell>
                    <TableCell className="px-4">
                      {p.castrado ? (
                        <Badge className="badge-success-vivid">Castrado</Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-400 border-slate-200">Não Castrado</Badge>
                      )}
                    </TableCell>
                    <TableCell className="px-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/pets/${p.id}`)}
                          className="h-9 w-9 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                          title="Ver Histórico/Prontuário"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setForm({ ...p, tutor_id: p.tutor_id }); setEditingId(p.id); setOpen(true); }}
                          className="h-9 w-9 text-slate-500 hover:text-slate-600 hover:bg-slate-100 rounded-full"
                          title="Editar Cadastro"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(p.id)}
                          className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full"
                          title="Excluir Pet"
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
            <AlertDialogTitle>Tem certeza que deseja excluir este pet?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os dados do animal serão removidos permanentemente.
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
