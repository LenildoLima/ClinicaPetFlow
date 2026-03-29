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
import { Plus, Calendar as CalendarIcon, Clock, MoreVertical, FileText, CalendarDays } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

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
interface Usuario { id: string; nome: string }

const statusColors: Record<string, string> = {
  agendado: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  confirmado: 'bg-warning/20 text-warning dark:text-warning-foreground',
  em_atendimento: 'bg-info/20 text-info dark:text-info-foreground',
  concluido: 'bg-success/20 text-success dark:text-success-foreground',
  cancelado: 'bg-destructive/10 text-destructive',
  faltou: 'bg-muted text-muted-foreground',
};

const statusLabels: Record<string, string> = {
  agendado: 'Agendado',
  confirmado: 'Confirmado',
  em_atendimento: 'Em Atendimento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
  faltou: 'Faltou',
};

const tipoLabels: Record<string, string> = {
  consulta: 'Consulta',
  retorno: 'Retorno',
  cirurgia: 'Cirurgia',
  exame: 'Exame',
  vacina: 'Vacina',
  banho_tosa: 'Banho e Tosa',
  emergencia: 'Emergência',
};

const emptyForm = { tutor_id: '', pet_id: '', veterinario_id: '', data_hora: '', tipo: 'consulta', motivo: '', observacoes: '' };

export default function Agenda() {
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [tutores, setTutores] = useState<Tutor[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [veterinarios, setVeterinarios] = useState<Usuario[]>([]);
  const [tutorSearch, setTutorSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [filterType, setFilterType] = useState<'today' | 'week' | 'month' | 'date'>('today');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const navigate = useNavigate();

  const fetchConsultas = async () => {
    let start, end;
    const now = new Date();

    if (filterType === 'today') {
      start = startOfDay(now);
      end = endOfDay(now);
    } else if (filterType === 'week') {
      start = startOfWeek(now, { locale: ptBR, weekStartsOn: 1 });
      end = endOfWeek(now, { locale: ptBR, weekStartsOn: 1 });
    } else if (filterType === 'month') {
      start = startOfMonth(now);
      end = endOfMonth(now);
    } else {
      const date = selectedDate || new Date();
      start = startOfDay(date);
      end = endOfDay(date);
    }

    const { data } = await supabase
      .from('consultas')
      .select('*, pets(nome), tutores(nome)')
      .gte('data_hora', start.toISOString())
      .lte('data_hora', end.toISOString())
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

  const fetchVeterinarios = async () => {
    const { data } = await supabase.from('usuarios').select('id, nome').eq('cargo', 'veterinario').order('nome');
    setVeterinarios(data ?? []);
  };

  useEffect(() => { fetchConsultas(); }, [filterType, selectedDate]);
  useEffect(() => { fetchTutores(); }, [tutorSearch]);
  useEffect(() => { fetchVeterinarios(); }, []);
  useEffect(() => {
    if (form.tutor_id) fetchPetsByTutor(form.tutor_id);
    else setPets([]);
  }, [form.tutor_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('consultas').insert([{
      tutor_id: form.tutor_id,
      pet_id: form.pet_id,
      veterinario_id: form.veterinario_id,
      data_hora: new Date(`${form.data_hora}:00-03:00`).toISOString(),
      tipo: form.tipo,
      motivo: form.motivo,
      observacoes: form.observacoes,
      status: 'agendado',
      criado_por: user?.id,
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

              <div className="space-y-1">
                <Label>Veterinário</Label>
                <Select value={form.veterinario_id} onValueChange={(v) => setForm({ ...form, veterinario_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione o veterinário" /></SelectTrigger>
                  <SelectContent>
                    {veterinarios.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(tipoLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Data e Hora</Label>
                <Input type="datetime-local" value={form.data_hora} onChange={(e) => setForm({ ...form, data_hora: e.target.value })} required />
              </div>

              <div className="space-y-1">
                <Label>Motivo</Label>
                <Input value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} placeholder="Ex: Consulta de rotina, vacinação..." required />
              </div>

              <div className="space-y-1">
                <Label>Observações (Opcional)</Label>
                <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} placeholder="Alguma observação importante para esta consulta?" className="resize-none" rows={3} />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>Salvar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center gap-2 bg-white/50 dark:bg-muted/20 p-1.5 rounded-xl border shadow-sm backdrop-blur-sm">
        <Button 
          variant={filterType === 'today' ? 'default' : 'ghost'} 
          size="sm"
          onClick={() => setFilterType('today')}
          className={cn(
            "rounded-lg transition-all",
            filterType === 'today' ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-primary/10"
          )}
        >
          <CalendarDays className="mr-2 h-4 w-4" />
          Hoje
        </Button>
        <Button 
          variant={filterType === 'week' ? 'default' : 'ghost'} 
          size="sm"
          onClick={() => setFilterType('week')}
          className={cn(
            "rounded-lg transition-all",
            filterType === 'week' ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-primary/10"
          )}
        >
          Esta Semana
        </Button>
        <Button 
          variant={filterType === 'month' ? 'default' : 'ghost'} 
          size="sm"
          onClick={() => setFilterType('month')}
          className={cn(
            "rounded-lg transition-all",
            filterType === 'month' ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-primary/10"
          )}
        >
          Este Mês
        </Button>
        <div className="flex items-center gap-2 ml-auto pr-1">
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={filterType === 'date' ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  "h-9 justify-start text-left font-normal rounded-lg px-3",
                  filterType === 'date' && "bg-primary text-primary-foreground shadow-sm",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate && filterType === 'date' ? (
                  format(selectedDate, "dd/MM/yyyy", { locale: ptBR })
                ) : (
                  "Selecionar data"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    setFilterType('date');
                    setIsCalendarOpen(false);
                  }
                }}
                locale={ptBR}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-primary" />
            {filterType === 'today' && "Consultas de Hoje"}
            {filterType === 'week' && "Consultas desta Semana"}
            {filterType === 'month' && "Consultas deste Mês"}
            {filterType === 'date' && `Consultas de ${selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : '...'}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {consultas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <CalendarIcon className="h-10 w-10 mb-2" />
              <p>Nenhuma consulta agendada para este período</p>
            </div>
          ) : (
            <div className="space-y-3">
              {consultas.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-semibold text-primary min-w-[60px]">
                      {new Date(c.data_hora).toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        timeZone: 'America/Sao_Paulo'
                      })}
                    </span>
                    <div>
                      <p className="font-medium text-foreground">{c.pets?.nome ?? 'Pet'}</p>
                      <p className="text-sm text-muted-foreground">
                        Tutor: {c.tutores?.nome ?? '—'} • {tipoLabels[c.tipo] || c.tipo} {c.motivo && `• ${c.motivo}`}
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
