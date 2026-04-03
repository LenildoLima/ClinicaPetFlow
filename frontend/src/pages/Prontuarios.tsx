import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, Search, FileText, User, Filter } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from "@/components/ui/skeleton";

interface Prontuario {
  id: string;
  data_atendimento: string;
  diagnostico: string;
  pets: {
    nome: string;
    especie: string;
    raca: string;
    foto_url: string;
    tutores: { nome: string } | null;
  } | null;
  usuarios: { nome: string } | null;
}

export default function Prontuarios() {
  const [prontuarios, setProntuarios] = useState<Prontuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [veterinarios, setVeterinarios] = useState<{ id: string, nome: string }[]>([]);
  const [selectedVet, setSelectedVet] = useState('all');
  const navigate = useNavigate();

  const fetchProntuarios = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('prontuarios')
        .select(`
          id, data_atendimento, diagnostico,
          pets ( nome, especie, raca, foto_url, tutores ( nome ) ),
          usuarios ( nome )
        `)
        .order('data_atendimento', { ascending: false });

      if (selectedVet !== 'all') {
        query = query.eq('veterinario_id', selectedVet);
      }

      if (filterType !== 'all') {
        const now = new Date();
        let start, end;
        if (filterType === 'today') {
          start = startOfDay(now);
          end = endOfDay(now);
        } else if (filterType === 'week') {
          start = startOfWeek(now, { locale: ptBR, weekStartsOn: 1 });
          end = endOfWeek(now, { locale: ptBR, weekStartsOn: 1 });
        } else {
          start = startOfMonth(now);
          end = endOfMonth(now);
        }
        query = query.gte('data_atendimento', start.toISOString()).lte('data_atendimento', end.toISOString());
      }

      const { data } = await query;
      let filtered = (data as unknown as Prontuario[]) ?? [];
      
      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(p => 
          p.pets?.nome.toLowerCase().includes(s) || 
          p.pets?.tutores?.nome.toLowerCase().includes(s)
        );
      }

      setProntuarios(filtered);
    } finally {
      setLoading(false);
    }
  };

  const fetchVeterinarios = async () => {
    const { data } = await supabase.from('usuarios').select('id, nome').eq('cargo', 'veterinario').order('nome');
    setVeterinarios(data ?? []);
  };

  useEffect(() => {
    fetchProntuarios();
    fetchVeterinarios();
  }, [search, filterType, selectedVet]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Prontuários</h1>
          <p className="text-muted-foreground text-sm">Histórico de atendimentos clínicos</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 bg-white/50 dark:bg-muted/10 p-4 rounded-xl border shadow-sm backdrop-blur-sm">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por pet ou tutor..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <Select value={selectedVet} onValueChange={setSelectedVet}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Veterinário" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Veterinários</SelectItem>
            {veterinarios.map(v => (
              <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
          <SelectTrigger className="w-[150px]">
            <CalendarIcon className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tudo</SelectItem>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="week">Esta Semana</SelectItem>
            <SelectItem value="month">Este Mês</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse border-l-4 border-l-primary/20">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4 mb-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                  <div className="space-y-2 border-t pt-3">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-5/6" />
                  </div>
                  <Skeleton className="h-8 w-full mt-4" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : prontuarios.map((p) => (
          <Card key={p.id} className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-primary" onClick={() => navigate(`/prontuarios/${p.id}`)}>
            <CardContent className="p-5">
              <div className="flex items-start gap-4 mb-4">
                <Avatar className="h-12 w-12 border">
                  <AvatarImage src={p.pets?.foto_url} alt={p.pets?.nome} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {p.pets?.nome?.charAt(0) || <FileText />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground truncate">{p.pets?.nome}</h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {p.pets?.especie} {p.pets?.raca ? `• ${p.pets.raca}` : ''}
                  </p>
                  <p className="text-xs font-medium text-foreground truncate mt-1">
                    Tutor: {p.pets?.tutores?.nome}
                  </p>
                </div>
              </div>

              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    {new Date(p.data_atendimento).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                  </span>
                  <span className="text-primary font-medium flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Dr(a). {p.usuarios?.nome}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 italic">
                  "{p.diagnostico || 'Sem diagnóstico resumido...'}"
                </p>
              </div>
              
              <Button variant="outline" size="sm" className="w-full mt-4 h-8 text-xs">
                Ver Prontuário Completo
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {prontuarios.length === 0 && (
        <div className="text-center py-20 bg-muted/5 rounded-2xl border-2 border-dashed">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium text-foreground">Nenhum prontuário encontrado</h3>
          <p className="text-muted-foreground">Tente ajustar seus filtros ou busca.</p>
        </div>
      )}
    </div>
  );
}
