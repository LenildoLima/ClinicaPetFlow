import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="max-w-md w-full border-dashed">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <Sparkles className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
          <p className="text-muted-foreground">
            Esta funcionalidade está em desenvolvimento e estará disponível em breve!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
