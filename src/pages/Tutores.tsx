import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Users } from 'lucide-react';

interface Tutor {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  whatsapp: string;
  email: string;
  cidade: string;
  estado: string;
}

const emptyForm = { nome: '', cpf: '', telefone: '', whatsapp: '', email: '', cidade: '', estado: '' };

export default function Tutores() {
  const [tutores, setTutores] = useState<Tutor[]>([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchTutores = async () => {
    let query = supabase.from('tutores').select('*').order('nome');
    if (search) query = query.ilike('nome', `%${search}%`);
    const { data } = await query;
    setTutores(data ?? []);
  };

  useEffect(() => { fetchTutores(); }, [search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('tutores').insert([form]);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Tutor cadastrado com sucesso!' });
      setForm(emptyForm);
      setOpen(false);
      fetchTutores();
    }
    setLoading(false);
  };

  const fields: { key: keyof typeof emptyForm; label: string; type?: string }[] = [
    { key: 'nome', label: 'Nome' },
    { key: 'cpf', label: 'CPF' },
    { key: 'telefone', label: 'Telefone' },
    { key: 'whatsapp', label: 'WhatsApp' },
    { key: 'email', label: 'E-mail', type: 'email' },
    { key: 'cidade', label: 'Cidade' },
    { key: 'estado', label: 'Estado' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tutores</h1>
          <p className="text-muted-foreground text-sm">Gerencie os tutores cadastrados</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Novo Tutor</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Cadastrar Tutor</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {fields.map((f) => (
                <div key={f.key} className="space-y-1">
                  <Label>{f.label}</Label>
                  <Input
                    type={f.type ?? 'text'}
                    value={form[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    required={f.key === 'nome'}
                  />
                </div>
              ))}
              <Button type="submit" className="w-full" disabled={loading}>
                Salvar
              </Button>
            </form>
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
          {tutores.length === 0 ? (
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
                    <TableCell>{t.cidade}</TableCell>
                    <TableCell>{t.estado}</TableCell>
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
