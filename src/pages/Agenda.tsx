import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Plus, Calendar, Clock, MoreVertical, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Tutor { id: string; nome: string }
interface Pet { id: string; nome: string; tutor_id: string }
interface Consulta {
  id: string;
  data_hora: string;
  tipo: string;
  motivo: string;
  status: string;
  tutor_id: string;
  pet_id: string;
  pets: { nome: string } | null;
  tutores: { nome: string } | null;
}

const statusColors: Record<string, string> = {
  agendado: 'bg-info text-info-foreground',
  confirmado: 'bg-warning text-warning-foreground',
  concluido: 'bg-success text-success-foreground',
  cancelado: 'bg-destructive text-destructive-foreground',
};

const statusLabels: Record<string, string> = {
  agendado: 'Agendado',
  confirmado: 'Confirmado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

const tipoOptions = ['Consulta', 'Retorno', 'Vacina', 'Emergência'];

const emptyForm = { tutor_id: '', pet_id: '', data_hora: '', tipo: '', motivo: '' };

export default function Agenda() {
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [tutores, setTutores] = useState<Tutor[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [tutorSearch, setTutorSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchConsultas = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('consultas')
      .select('*, pets(nome), tutores(nome)')
      .gte('data_hora', `${today}T00:00:00`)
      .lte('data_hora', `${today}T23:59:59`)
      .order('data_hora', { ascending: true });
    setConsultas((data as unknown as Consulta[]) ?? []);
  };

  const fetchTutores = async () => {
    let query = supabase.from('tutores').select('id, nome').order('nome');
    if (tutorSearch) query = query.ilike('nome', `%${tutorSearch}%`);
    const { data } = await query;
    setTutores(data ?? []);
  };

  const fetchPetsByTutor = async (tutorId: string) => {
    const { data } = await supabase.from('pets').select('id, nome, tutor_id').eq('tutor_id', tutorId).order('nome');
    setPets(data ?? []);
  };

  useEffect(() => { fetchConsultas(); }, []);
  useEffect(() => { fetchTutores(); }, [tutorSearch]);
  useEffect(() => {
    if (form.tutor_id) fetchPetsByTutor(form.tutor_id);
    else setPets([]);
  }, [form.tutor_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('consultas').insert([{
      tutor_id: form.tutor_id,
      pet_id: form.pet_id,
      data_hora: form.data_hora,
      tipo: form.tipo,
      motivo: form.motivo,
      status: 'agendado',
    }]);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Consulta agendada com sucesso!' });
      setForm(emptyForm);
      setTutorSearch('');
      setOpen(false);
      fetchConsultas();
    }
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('consultas').update({ status }).eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      fetchConsultas();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
          <p className="text-muted-foreground text-sm">
            {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Nova Consulta</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Agendar Consulta</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label>Tutor</Label>
                <Input
                  placeholder="Buscar tutor..."
                  value={tutorSearch}
                  onChange={(e) => setTutorSearch(e.target.value)}
                  className="mb-2"
                />
                <Select value={form.tutor_id} onValueChange={(v) => setForm({ ...form, tutor_id: v, pet_id: '' })}>
                  <SelectTrigger><SelectValue placeholder="Selecione o tutor" /></SelectTrigger>
                  <SelectContent>
                    {tutores.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Pet</Label>
                <Select value={form.pet_id} onValueChange={(v) => setForm({ ...form, pet_id: v })} disabled={!form.tutor_id}>
                  <SelectTrigger><SelectValue placeholder={form.tutor_id ? 'Selecione o pet' : 'Selecione um tutor primeiro'} /></SelectTrigger>
                  <SelectContent>
                    {pets.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Data e Hora</Label>
                  <Input type="datetime-local" value={form.data_hora} onChange={(e) => setForm({ ...form, data_hora: e.target.value })} required />
                </div>
                <div className="space-y-1">
                  <Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {tipoOptions.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Motivo</Label>
                <Textarea value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} placeholder="Descreva o motivo da consulta..." />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>Salvar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-primary" />
            Consultas do Dia
          </CardTitle>
        </CardHeader>
        <CardContent>
          {consultas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Calendar className="h-10 w-10 mb-2" />
              <p>Nenhuma consulta agendada para hoje</p>
            </div>
          ) : (
            <div className="space-y-3">
              {consultas.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-semibold text-primary min-w-[60px]">
                      {format(new Date(c.data_hora), 'HH:mm')}
                    </span>
                    <div>
                      <p className="font-medium text-foreground">{c.pets?.nome ?? 'Pet'}</p>
                      <p className="text-sm text-muted-foreground">
                        Tutor: {c.tutores?.nome ?? '—'} • {c.tipo} {c.motivo && `• ${c.motivo}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColors[c.status] ?? 'bg-muted text-muted-foreground'}>
                      {statusLabels[c.status] ?? c.status}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {Object.entries(statusLabels).map(([key, label]) => (
                          <DropdownMenuItem key={key} onClick={() => updateStatus(c.id, key)}>
                            {label}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuItem onClick={() => navigate(`/prontuario/${c.id}`)}>
                          <FileText className="mr-2 h-4 w-4" />
                          Prontuário
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
