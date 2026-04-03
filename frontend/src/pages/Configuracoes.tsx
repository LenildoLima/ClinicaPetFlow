import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Users, Edit2, Save, UserCircle } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";

export default function Configuracoes() {
  const { user, userData, refreshUserData } = useAuth();
  const { toast } = useToast();

  // Definição das abas visíveis baseadas no cargo
  const abasDisponiveis = [
    { id: 'perfil', label: 'Meu Perfil', icon: UserCircle, roles: ['admin', 'veterinario', 'recepcionista'] },
    { id: 'usuarios', label: 'Usuários', icon: Users, roles: ['admin'] },
  ].filter(aba => userData && aba.roles.includes(userData.cargo));

  // O activeTab padrão será a primeira aba disponível (perfil para todos)
  const [activeTab, setActiveTab] = useState(abasDisponiveis.length > 0 ? abasDisponiveis[0].id : "perfil");

  useEffect(() => {
    // Garantir que a aba ativa seja resolvida se userData demorar para carregar
    if (userData && !abasDisponiveis.find(a => a.id === activeTab)) {
      setActiveTab(abasDisponiveis[0]?.id || "perfil");
    }
  }, [userData, activeTab, abasDisponiveis]);

  // ==========================================
  // ESTADOS E LÓGICA - ABA MEU PERFIL
  // ==========================================
  const [nomePerfil, setNomePerfil] = useState('');
  const [telefonePerfil, setTelefonePerfil] = useState('');
  const [whatsappPerfil, setWhatsappPerfil] = useState('');
  const [loadingDadosPerfil, setLoadingDadosPerfil] = useState(false);

  const [uploadingFoto, setUploadingFoto] = useState(false);

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');
  const [loadingSenha, setLoadingSenha] = useState(false);

  useEffect(() => {
    if (userData) {
      setNomePerfil(userData.nome || '');
      setTelefonePerfil(userData.telefone || '');
      setWhatsappPerfil(userData.whatsapp || '');
    }
  }, [userData]);

  const handleSaveDadosPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoadingDadosPerfil(true);
    const { error } = await supabase
      .from('usuarios')
      .update({ nome: nomePerfil, telefone: telefonePerfil, whatsapp: whatsappPerfil })
      .eq('id', user.id);

    if (error) {
      toast({ title: "Erro ao salvar dados", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Dados atualizados com sucesso", className: "bg-green-500 text-white" });
      refreshUserData();
    }
    setLoadingDadosPerfil(false);
  };


  const handleUploadFoto = async (file: File) => {
    try {
      if (!user) return;
      setUploadingFoto(true);

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ foto_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast({ title: "Foto atualizada com sucesso!", className: "bg-green-500 text-white" });
      refreshUserData();
    } catch (error: any) {
      toast({ title: "Erro ao enviar foto", description: error.message, variant: "destructive" });
    } finally {
      setUploadingFoto(false);
    }
  };

  const handleSaveSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenha !== confirmaSenha) {
      toast({ title: "As senhas não conferem", variant: "destructive" });
      return;
    }
    setLoadingSenha(true);
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    if (error) {
      toast({ title: "Erro ao alterar senha", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Senha alterada com sucesso", className: "bg-green-500 text-white" });
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmaSenha('');
    }
    setLoadingSenha(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // ==========================================
  // ESTADOS E LÓGICA - ABA USUÁRIOS
  // ==========================================
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [editUsuarioModalOpen, setEditUsuarioModalOpen] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<any>(null);
  const [cargoEdit, setCargoEdit] = useState<string>('');

  useEffect(() => {
    if (selectedUsuario) {
      setCargoEdit(selectedUsuario.cargo || '');
    }
  }, [selectedUsuario]);

  const fetchUsuarios = async () => {
    setLoadingUsuarios(true);
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .order('nome', { ascending: true });

    if (error) {
      toast({ title: "Erro ao buscar usuários", description: error.message, variant: "destructive" });
    } else {
      setUsuarios(data || []);
    }
    setLoadingUsuarios(false);
  };

  const handleToggleUsuario = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('usuarios')
      .update({ ativo: !currentStatus })
      .eq('id', id);
    if (error) {
      toast({ title: "Erro ao alterar status", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Status alterado com sucesso" });
      fetchUsuarios();
    }
  };

  const handleSaveUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const updates = {
      nome: formData.get("nome"),
      telefone: formData.get("telefone"),
      cargo: formData.get("cargo"),
      crmv: formData.get("cargo") === "veterinario" ? formData.get("crmv") : null,
    };

    const { error } = await supabase
      .from('usuarios')
      .update(updates)
      .eq('id', selectedUsuario.id);

    if (error) {
      toast({ title: "Erro ao atualizar usuário", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Usuário atualizado com sucesso" });
      setEditUsuarioModalOpen(false);
      fetchUsuarios();
    }
  };

  // Efeitos para carregar dados das abas administrativas
  useEffect(() => {
    if (activeTab === "usuarios" && userData?.cargo === 'admin') fetchUsuarios();
  }, [activeTab, userData]);

  // ==========================================
  // HELPERS (BADGES)
  // ==========================================
  const getCargoBadge = (cargo: string) => {
    switch (cargo?.toLowerCase()) {
      case "admin": return <Badge className="bg-purple-500 hover:bg-purple-600">Administrador</Badge>;
      case "veterinario": return <Badge className="bg-blue-500 hover:bg-blue-600">Veterinário</Badge>;
      case "recepcionista": return <Badge className="bg-green-500 hover:bg-green-600">Recepcionista</Badge>;
      default: return <Badge variant="outline">{cargo}</Badge>;
    }
  };

  if (!user || !userData) {
    return <div className="p-8 text-center text-muted-foreground">Carregando configurações...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            {userData.cargo === 'admin'
              ? 'Gerenciamento de conta e usuários do sistema.'
              : 'Gerencie suas informações pessoais e de segurança da conta.'}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          {abasDisponiveis.map(aba => (
            <TabsTrigger key={aba.id} value={aba.id} className="flex items-center gap-2">
              <aba.icon className="w-4 h-4" /> {aba.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* =======================================================
                                MEU PERFIL
        ======================================================= */}
        <TabsContent value="perfil" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
            {/* COLUNA ESQUERDA: FOTO E DETALHES DE CONTA */}
            <div className="space-y-6">
              <Card>
                  <div className="flex flex-col items-center">
                    <ImageUpload
                      value={userData.foto_url || undefined}
                      onChange={(file) => handleUploadFoto(file)}
                      shape="circle"
                      size="lg"
                    />
                    {uploadingFoto && <p className="text-sm text-muted-foreground mt-2">Enviando...</p>}
                  </div>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informações da Conta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${userData.ativo ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-sm">{userData.ativo ? 'Ativa' : 'Inativa'}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500">Membro desde</p>
                    <p className="text-sm">{userData.criado_em ? formatDate(userData.criado_em) : '-'}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* COLUNA DIREITA: DADOS PESSOAIS E SENHA */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Dados Pessoais</CardTitle>
                  <CardDescription>Atualize suas informações de contato básicas.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveDadosPerfil} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="nome">Nome Completo</Label>
                        <Input id="nome" value={nomePerfil} onChange={(e) => setNomePerfil(e.target.value)} required />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="telefone">Telefone</Label>
                        <Input id="telefone" value={telefonePerfil} onChange={(e) => setTelefonePerfil(e.target.value)} />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="whatsapp">WhatsApp</Label>
                        <Input id="whatsapp" value={whatsappPerfil} onChange={(e) => setWhatsappPerfil(e.target.value)} placeholder="(DD) 90000-0000" />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="email" className="text-gray-500">Email (somente leitura)</Label>
                        <Input id="email" value={userData.email} readOnly className="bg-gray-50 text-gray-500" />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="cargo" className="text-gray-500">Cargo (somente leitura)</Label>
                        <Input id="cargo" value={userData.cargo} readOnly className="bg-gray-50 text-gray-500 capitalize" />
                      </div>

                      {userData.cargo === 'veterinario' && (
                        <div className="space-y-2">
                          <Label htmlFor="crmv" className="text-gray-500">CRMV (somente leitura)</Label>
                          <Input id="crmv" value={userData.crmv || '-'} readOnly className="bg-gray-50 text-gray-500" />
                        </div>
                      )}
                    </div>

                    <div className="pt-4">
                      <Button type="submit" disabled={loadingDadosPerfil} className="bg-green-600 hover:bg-green-700 w-full sm:w-auto gap-2">
                        <Save className="w-4 h-4" />
                        {loadingDadosPerfil ? 'Salvando...' : 'Salvar Alterações'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Alterar Senha</CardTitle>
                  <CardDescription>Para sua segurança, recomendamos senhas fortes e únicas.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveSenha} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="senhaAtual">Senha Atual</Label>
                      <Input id="senhaAtual" type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="novaSenha">Nova Senha</Label>
                        <Input id="novaSenha" type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmaSenha">Confirmar Nova Senha</Label>
                        <Input id="confirmaSenha" type="password" value={confirmaSenha} onChange={(e) => setConfirmaSenha(e.target.value)} required />
                      </div>
                    </div>
                    <div className="pt-4">
                      <Button type="submit" disabled={loadingSenha} className="bg-green-600 hover:bg-green-700 w-full sm:w-auto gap-2">
                        <Save className="w-4 h-4" />
                        {loadingSenha ? 'Alterando...' : 'Alterar Senha'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>


        {/* =======================================================
                                USUÁRIOS
        ======================================================= */}
        {userData.cargo === 'admin' && (
          <TabsContent value="usuarios" className="space-y-4">
            <div className="rounded-md border bg-white overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="w-16">Foto</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingUsuarios ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">Carregando...</TableCell></TableRow>
                  ) : usuarios.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">Nenhum usuário encontrado.</TableCell></TableRow>
                  ) : (
                    usuarios.map((usr) => (
                      <TableRow key={usr.id} className="hover:bg-gray-50 transition-colors">
                        <TableCell>
                          <Avatar>
                            <AvatarImage src={usr.foto_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">
                              {usr.nome?.substring(0, 2).toUpperCase() || "US"}
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="font-medium">{usr.nome}</TableCell>
                        <TableCell className="text-gray-500">{usr.email}</TableCell>
                        <TableCell>{usr.telefone || '-'}</TableCell>
                        <TableCell>
                          <div className="flex flex-col items-start gap-1">
                            {getCargoBadge(usr.cargo)}
                            {usr.cargo === "veterinario" && usr.crmv && (
                              <span className="text-xs text-muted-foreground">CRMV: {usr.crmv}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Switch
                              checked={usr.ativo}
                              onCheckedChange={() => handleToggleUsuario(usr.id, usr.ativo)}
                              title={usr.ativo ? "Desativar usuário" : "Ativar usuário"}
                            />
                            <span className="text-xs text-muted-foreground w-12 text-left">
                              {usr.ativo ? "Ativo" : "Inativo"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setSelectedUsuario(usr); setEditUsuarioModalOpen(true); }}
                          >
                            <Edit2 className="w-4 h-4 text-gray-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        )}
      </Tabs>


      {/* =======================================================
                          MODAIS DE USUÁRIOS
      ======================================================= */}
      {userData.cargo === 'admin' && (
        <Dialog open={editUsuarioModalOpen} onOpenChange={setEditUsuarioModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
            </DialogHeader>
            {selectedUsuario && (
              <form onSubmit={handleSaveUsuario} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="modal-nome">Nome</Label>
                  <Input id="modal-nome" name="nome" defaultValue={selectedUsuario.nome} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modal-email">E-mail</Label>
                  <Input id="modal-email" name="email" defaultValue={selectedUsuario.email} readOnly className="bg-gray-50 text-gray-500" />
                  <p className="text-[10px] text-gray-500">O e-mail não pode ser alterado por aqui.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modal-telefone">Telefone</Label>
                  <Input id="modal-telefone" name="telefone" defaultValue={selectedUsuario.telefone || ""} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="modal-cargo">Cargo</Label>
                  <Select name="cargo" value={cargoEdit} onValueChange={setCargoEdit}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cargo..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="veterinario">Veterinário</SelectItem>
                      <SelectItem value="recepcionista">Recepcionista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {cargoEdit === "veterinario" && (
                  <div className="space-y-2">
                    <Label htmlFor="modal-crmv">CRMV</Label>
                    <Input id="modal-crmv" name="crmv" defaultValue={selectedUsuario.crmv || ""} />
                  </div>
                )}

                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={() => setEditUsuarioModalOpen(false)}>Cancelar</Button>
                  <Button type="submit">Salvar</Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
