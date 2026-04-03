import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Plus, Search, Heart, Pencil, Trash2, History } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
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
  const [pets, setPets] = useState<Pet[]>([]);
  const [tutores, setTutores] = useState<Tutor[]>([]);
  const [search, setSearch] = useState('');
  const [tutorSearch, setTutorSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPets = async () => {
    setLoading(true);
    try {
      let query = supabase.from('pets').select('*, tutores(nome)').order('nome');
      if (search) query = query.ilike('nome', `%${search}%`);
      const { data } = await query;
      setPets((data as unknown as Pet[]) ?? []);
    } finally {
      setLoading(false);
    }
  };

  const fetchTutores = async () => {
    let query = supabase.from('tutores').select('id, nome').order('nome');
    if (tutorSearch) query = query.ilike('nome', `%${tutorSearch}%`);
    const { data } = await query;
    setTutores(data ?? []);
  };

  useEffect(() => { fetchPets(); }, [search]);
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
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Pet' : 'Cadastrar Pet'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-1">
                <Label>Nome</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Espécie</Label>
                  <Select value={form.especie} onValueChange={(v) => setForm({ ...form, especie: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
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
                <div className="space-y-1">
                  <Label>Raça</Label>
                  <Input value={form.raca} onChange={(e) => setForm({ ...form, raca: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Sexo</Label>
                  <Select value={form.sexo} onValueChange={(v) => setForm({ ...form, sexo: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="macho">Macho</SelectItem>
                      <SelectItem value="femea">Fêmea</SelectItem>
                      <SelectItem value="nao_informado">Não Informado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Data de Nascimento</Label>
                  <Input type="date" value={form.data_nascimento} onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="castrado"
                  checked={form.castrado}
                  onCheckedChange={(v) => setForm({ ...form, castrado: v === true })}
                />
                <Label htmlFor="castrado">Castrado</Label>
              </div>
              <div className="space-y-1">
                <Label>Tutor</Label>
                {editingId ? (
                   <Input value={pets.find(p => p.id === editingId)?.tutores?.nome || '—'} disabled />
                ) : (
                  <>
                    <Input
                      placeholder="Buscar tutor..."
                      value={tutorSearch}
                      onChange={(e) => setTutorSearch(e.target.value)}
                      className="mb-2"
                    />
                    <Select value={form.tutor_id} onValueChange={(v) => setForm({ ...form, tutor_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione o tutor" /></SelectTrigger>
                      <SelectContent>
                        {tutores.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
              <div className="space-y-1">
                <Label>Observações</Label>
                <Input value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
              </div>
              <Button type="submit" className="w-full mt-4" disabled={loading}>
                {editingId ? 'Salvar Alterações' : 'Salvar'}
              </Button>
            </form>
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
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Heart className="h-10 w-10 mb-2" />
              <p>Nenhum pet encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Espécie</TableHead>
                  <TableHead>Raça</TableHead>
                  <TableHead>Sexo</TableHead>
                  <TableHead>Tutor</TableHead>
                  <TableHead>Castrado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pets.map((p) => (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-gray-50/50" onClick={() => navigate(`/pets/${p.id}`)}>
                    <TableCell className="font-medium">{p.nome}</TableCell>
                    <TableCell>{especieLabels[p.especie] || p.especie}</TableCell>
                    <TableCell>{p.raca}</TableCell>
                    <TableCell>{sexoLabels[p.sexo] || p.sexo}</TableCell>
                    <TableCell>{p.tutores?.nome ?? '—'}</TableCell>
                    <TableCell>{p.castrado ? 'Sim' : 'Não'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/pets/${p.id}`)}
                          className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                          title="Ver Histórico"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(p)}
                          className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(p.id)}
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
