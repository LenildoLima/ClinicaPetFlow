import { useEffect, useState } from 'react';
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
import { Plus, Search, Heart } from 'lucide-react';

interface Tutor { id: string; nome: string }
interface Pet {
  id: string;
  nome: string;
  especie: string;
  raca: string;
  sexo: string;
  data_nascimento: string;
  castrado: boolean;
  tutor_id: string;
  tutores: { nome: string } | null;
}

const emptyForm = { nome: '', especie: '', raca: '', sexo: '', data_nascimento: '', castrado: false, tutor_id: '' };

export default function Pets() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [tutores, setTutores] = useState<Tutor[]>([]);
  const [search, setSearch] = useState('');
  const [tutorSearch, setTutorSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchPets = async () => {
    let query = supabase.from('pets').select('*, tutores(nome)').order('nome');
    if (search) query = query.ilike('nome', `%${search}%`);
    const { data } = await query;
    setPets((data as unknown as Pet[]) ?? []);
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
    const { error } = await supabase.from('pets').insert([{
      nome: form.nome,
      especie: form.especie,
      raca: form.raca,
      sexo: form.sexo,
      data_nascimento: form.data_nascimento || null,
      castrado: form.castrado,
      tutor_id: form.tutor_id || null,
    }]);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Pet cadastrado com sucesso!' });
      setForm(emptyForm);
      setOpen(false);
      fetchPets();
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pets</h1>
          <p className="text-muted-foreground text-sm">Gerencie os pets cadastrados</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Novo Pet</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Cadastrar Pet</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                      <SelectItem value="Cão">Cão</SelectItem>
                      <SelectItem value="Gato">Gato</SelectItem>
                      <SelectItem value="Ave">Ave</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
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
                      <SelectItem value="Macho">Macho</SelectItem>
                      <SelectItem value="Fêmea">Fêmea</SelectItem>
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
              </div>
              <Button type="submit" className="w-full" disabled={loading}>Salvar</Button>
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
          {pets.length === 0 ? (
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
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.nome}</TableCell>
                    <TableCell>{p.especie}</TableCell>
                    <TableCell>{p.raca}</TableCell>
                    <TableCell>{p.sexo}</TableCell>
                    <TableCell>{p.tutores?.nome ?? '—'}</TableCell>
                    <TableCell>{p.castrado ? 'Sim' : 'Não'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
