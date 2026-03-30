import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ArrowLeft, Heart, Calendar, Stethoscope, 
  Syringe, FileText, FileSearch, HelpCircle, FileCheck
} from 'lucide-react';
import { format, differenceInYears, differenceInMonths, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PetProfile {
  id: string;
  nome: string;
  especie: string;
  raca: string;
  sexo: string;
  data_nascimento: string;
  castrado: boolean;
  foto_url: string;
  tutores: { nome: string; telefone: string } | null;
}

interface ConsultaHist {
  id: string;
  data_hora: string;
  tipo: string;
  status: string;
  motivo: string;
  veterinarios: { nome: string } | null;
  prontuarios: { id: string }[];
}

interface ProntuarioHist {
  id: string;
  data_atendimento: string;
  diagnostico: string;
  veterinarios: { nome: string } | null;
}

interface VacinaHist {
  id: string;
  nome: string;
  fabricante: string;
  lote: string;
  data_aplicacao: string;
  data_reforco: string;
}

interface ExameHist {
  id: string;
  tipo: string;
  laboratorio: string;
  data_solicitacao: string;
  data_resultado: string;
  resultado_resumo: string;
  arquivo_url: string;
}

export default function PetHistorico() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const [pet, setPet] = useState<PetProfile | null>(null);
  const [consultas, setConsultas] = useState<ConsultaHist[]>([]);
  const [prontuarios, setProntuarios] = useState<ProntuarioHist[]>([]);
  const [vacinas, setVacinas] = useState<VacinaHist[]>([]);
  const [exames, setExames] = useState<ExameHist[]>([]);

  useEffect(() => {
    const fetchHistorico = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/buscar-historico-pet`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ pet_id: id })
          }
        );

        if (!response.ok) throw new Error('Falha ao buscar o histórico nativo (Edge Function)');

        const responseData = await response.json();
        
        // Verifica envelopamentos da Edge Function
        const historico = responseData.pet ? responseData : (responseData.data || {});

        setPet(historico.pet || null);
        setConsultas(historico.consultas || []);
        setProntuarios(historico.prontuarios || []);
        setVacinas(historico.vacinas || []);
        setExames(historico.exames || []);
      } catch (err) {
        console.error('Erro na carga da Edge Function', err);
        // Fallback robusto opcional caso local não tenha Edge Function
        await fetchFallback(id);
      } finally {
        setLoading(false);
      }
    };

    fetchHistorico();
  }, [id]);

  const fetchFallback = async (petId: string) => {
    try {
      const [petRes, consultasRes, prontuariosRes, vacinasRes, examesRes] = await Promise.all([
        supabase.from('pets').select('*, tutores(nome, telefone)').eq('id', petId).single(),
        supabase.from('consultas').select('id, data_hora, tipo, status, motivo, veterinarios:usuarios(nome), prontuarios(id)').eq('pet_id', petId).order('data_hora', { ascending: false }),
        supabase.from('prontuarios').select('id, data_atendimento, diagnostico, veterinarios:usuarios(nome)').eq('pet_id', petId).order('data_atendimento', { ascending: false }),
        supabase.from('vacinas').select('*').eq('pet_id', petId).order('data_aplicacao', { ascending: false }),
        supabase.from('exames').select('*').eq('pet_id', petId).order('data_solicitacao', { ascending: false }),
      ]);
      setPet(petRes.data as any);
      setConsultas(consultasRes.data as any || []);
      setProntuarios(prontuariosRes.data as any || []);
      setVacinas(vacinasRes.data as any || []);
      setExames(examesRes.data as any || []);
    } catch (e) {
      console.error(e);
    }
  };

  const calcIdade = (dataStr: string) => {
    if (!dataStr) return 'Não informada';
    const nascimento = new Date(dataStr);
    const hoje = new Date();
    const anos = differenceInYears(hoje, nascimento);
    if (anos > 0) return `${anos} ano${anos > 1 ? 's' : ''}`;
    const meses = differenceInMonths(hoje, nascimento);
    if (meses > 0) return `${meses} mes${meses > 1 ? 'es' : ''}`;
    const dias = differenceInDays(hoje, nascimento);
    return `${Math.max(0, dias)} dia${dias !== 1 ? 's' : ''}`;
  };

  const checkVacina = (dataReforcoStr: string) => {
    if (!dataReforcoStr) return null;
    const reforco = new Date(dataReforcoStr);
    const hoje = new Date();
    const difDias = differenceInDays(reforco, hoje);

    if (difDias < 0) return <Badge className="bg-red-500">Reforço atrasado</Badge>;
    if (difDias <= 30) return <Badge className="bg-yellow-500 text-yellow-950">Reforço próximo</Badge>;
    return null;
  };

  const formatData = (dataStr: string) => {
    if (!dataStr) return '—';
    return format(new Date(dataStr), "dd/MM/yyyy", { locale: ptBR });
  };

  const formatDataHora = (dataStr: string) => {
    if (!dataStr) return '—';
    return format(new Date(dataStr), "dd/MM/yy 'às' HH:mm", { locale: ptBR });
  };

  if (loading) return <div className="text-center p-8 text-muted-foreground">Carregando histórico do paciente...</div>;
  if (!pet) return <div className="text-center p-8 text-muted-foreground">Paciente não encontrado.</div>;

  // Cálculos dinâmicos
  const ultimaConsulta = consultas.find(c => new Date(c.data_hora) <= new Date())?.data_hora;
  const proximaVacinaObj = vacinas
    .filter(v => v.data_reforco && new Date(v.data_reforco) > new Date())
    .sort((a, b) => new Date(a.data_reforco).getTime() - new Date(b.data_reforco).getTime())[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/pets')} className="h-8 w-8">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Histórico Clínico</h1>
      </div>

      {/* CABEÇALHO DO PET */}
      <Card className="bg-primary/5 border-primary/10 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 pointer-events-none" />
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6">
          <Avatar className="w-28 h-28 border-4 border-white shadow-lg">
            <AvatarImage src={pet.foto_url || undefined} alt={pet.nome} className="object-cover" />
            <AvatarFallback className="text-3xl font-bold bg-primary/20 text-primary">
              {pet.nome.charAt(0)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 text-center md:text-left space-y-2">
            <h2 className="text-3xl font-extrabold text-gray-900 flex items-center justify-center md:justify-start gap-2">
              {pet.nome} 
              {pet.sexo === 'macho' && <span className="text-blue-500 text-lg" title="Macho">♂</span>}
              {pet.sexo === 'femea' && <span className="text-pink-500 text-lg" title="Fêmea">♀</span>}
            </h2>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <Badge variant="outline" className="bg-white">{pet.especie || 'Indefinido'} {pet.raca ? ` • ${pet.raca}` : ''}</Badge>
              <Badge variant="outline" className="bg-white">{calcIdade(pet.data_nascimento)}</Badge>
              <Badge variant="outline" className={pet.castrado ? "bg-blue-50 text-blue-700" : "bg-gray-50 text-gray-500"}>
                {pet.castrado ? 'Castrado: Sim' : 'Castrado: Não'}
              </Badge>
            </div>
            <div className="pt-2 text-sm text-muted-foreground flex items-center justify-center md:justify-start gap-2">
              <Heart className="w-4 h-4 text-red-400" />
              Tutor: <span className="font-semibold text-gray-700">{pet.tutores?.nome || '—'}</span>
              {pet.tutores?.telefone && <span>({pet.tutores.telefone})</span>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CARDS DE RESUMO */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-white shadow-sm border-gray-100">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
            <Stethoscope className="w-6 h-6 text-blue-500 mb-2" />
            <div className="text-2xl font-bold">{consultas.length}</div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Consultas</div>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm border-gray-100">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
            <Syringe className="w-6 h-6 text-green-500 mb-2" />
            <div className="text-2xl font-bold">{vacinas.length}</div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Vacinas</div>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm border-gray-100">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
            <FileSearch className="w-6 h-6 text-purple-500 mb-2" />
            <div className="text-2xl font-bold">{exames.length}</div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Exames</div>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm border-gray-100">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
            <Calendar className="w-6 h-6 text-orange-400 mb-2" />
            <div className="text-lg font-bold">{formatData(ultimaConsulta || '')}</div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Última Visita</div>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm border-gray-100">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
            <Heart className="w-6 h-6 text-red-500 mb-2" />
            <div className="text-lg font-bold">{proximaVacinaObj ? formatData(proximaVacinaObj.data_reforco) : '—'}</div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Próx. Reforço</div>
          </CardContent>
        </Card>
      </div>

      {/* ABAS */}
      <Tabs defaultValue="consultas" className="w-full">
        <TabsList className="bg-white border rounded-lg p-1 space-x-1 shadow-sm h-12 w-full justify-start overflow-x-auto">
          <TabsTrigger value="consultas" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none rounded-md px-4 py-2"><Stethoscope className="w-4 h-4 mr-2"/> Consultas</TabsTrigger>
          <TabsTrigger value="prontuarios" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none rounded-md px-4 py-2"><FileText className="w-4 h-4 mr-2"/> Prontuários</TabsTrigger>
          <TabsTrigger value="vacinas" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none rounded-md px-4 py-2"><Syringe className="w-4 h-4 mr-2"/> Vacinas</TabsTrigger>
          <TabsTrigger value="exames" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none rounded-md px-4 py-2"><FileSearch className="w-4 h-4 mr-2"/> Exames</TabsTrigger>
        </TabsList>

        <Card className="mt-4 border-none shadow-none">
          
          {/* ABA 1: CONSULTAS */}
          <TabsContent value="consultas">
            <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead>Data / Hora</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Veterinário</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consultas.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma consulta registrada.</TableCell></TableRow>
                  ) : consultas.map(c => {
                    const statusFinal = c.prontuarios?.length > 0 ? 'concluido' : c.status;
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{formatDataHora(c.data_hora)}</TableCell>
                        <TableCell className="capitalize">{c.tipo}</TableCell>
                        <TableCell>Dr(a). {c.veterinarios?.nome || '—'}</TableCell>
                        <TableCell className="text-muted-foreground truncate max-w-[200px]" title={c.motivo}>{c.motivo}</TableCell>
                        <TableCell>
                          {statusFinal === 'concluido' ? <Badge className="bg-green-500">Concluída</Badge> 
                           : statusFinal === 'agendado' ? <Badge className="bg-blue-500">Agendada</Badge>
                           : <Badge variant="outline">{statusFinal}</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          {c.prontuarios?.length > 0 && (
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/prontuarios/${c.prontuarios[0].id}`)}>
                              Ver Prontuário
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ABA 2: PRONTUÁRIOS */}
          <TabsContent value="prontuarios">
            <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead>Data do Atendimento</TableHead>
                    <TableHead>Veterinário Responsável</TableHead>
                    <TableHead>Diagnóstico Resumido</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prontuarios.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum prontuário registrado.</TableCell></TableRow>
                  ) : prontuarios.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium whitespace-nowrap">{formatDataHora(p.data_atendimento)}</TableCell>
                      <TableCell className="whitespace-nowrap">Dr(a). {p.veterinarios?.nome || '—'}</TableCell>
                      <TableCell className="text-muted-foreground line-clamp-2 max-w-[400px]">"{p.diagnostico || 'Sem diagnóstico formalizado...'}"</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" className="gap-2 shrink-0 bg-primary/5 text-primary border-primary/20 hover:bg-primary hover:text-white" onClick={() => navigate(`/prontuarios/${p.id}`)}>
                          <FileCheck className="w-4 h-4" /> Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ABA 3: VACINAS */}
          <TabsContent value="vacinas">
            <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead>Vacina / Produto</TableHead>
                    <TableHead>Fabricante</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Data da Aplicação</TableHead>
                    <TableHead>Próximo Reforço</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vacinas.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma vacina registrada.</TableCell></TableRow>
                  ) : vacinas.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.nome}</TableCell>
                      <TableCell>{v.fabricante || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{v.lote || '—'}</TableCell>
                      <TableCell>{formatData(v.data_aplicacao)}</TableCell>
                      <TableCell className="font-semibold">{formatData(v.data_reforco)}</TableCell>
                      <TableCell className="text-right">
                         {checkVacina(v.data_reforco) || <Badge variant="outline" className="text-gray-400">Em dia</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ABA 4: EXAMES */}
          <TabsContent value="exames">
            <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead>Tipo de Exame</TableHead>
                    <TableHead>Laboratório / Clínica</TableHead>
                    <TableHead>Data Solicitação</TableHead>
                    <TableHead>Data Resultado</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead className="text-right">Arquivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exames.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum exame registrado.</TableCell></TableRow>
                  ) : exames.map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.tipo}</TableCell>
                      <TableCell>{e.laboratorio || 'Interno'}</TableCell>
                      <TableCell>{formatData(e.data_solicitacao)}</TableCell>
                      <TableCell>{formatData(e.data_resultado)}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate" title={e.resultado_resumo}>{e.resultado_resumo || '—'}</TableCell>
                      <TableCell className="text-right">
                         {e.arquivo_url ? (
                           <Button variant="link" size="sm" onClick={() => window.open(e.arquivo_url, '_blank')} className="text-blue-600 p-0">
                             Baixar Laudo
                           </Button>
                         ) : (
                           <span className="text-xs text-gray-400">Sem anexo</span>
                         )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

        </Card>
      </Tabs>
    </div>
  );
}
