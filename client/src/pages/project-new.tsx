import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Project } from "@shared/schema";

const formSchema = z.object({
  name: z.string().min(1, "プロジェクト名は必須です").max(100),
  description: z.string().max(500).optional(),
  clientName: z.string().max(100).optional(),
  dueDate: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function ProjectNewPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      clientName: "",
      dueDate: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await apiRequest("POST", "/api/projects", data);
      return response as Project;
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "プロジェクト作成完了",
        description: "新しいプロジェクトが正常に作成されました。",
      });
      setLocation(`/projects/${project.id}`);
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "プロジェクトの作成に失敗しました。もう一度お試しください。",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    createMutation.mutate(data);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/projects")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create New Project</h1>
          <p className="text-muted-foreground">
            デザインフィードバックを収集するための新しいプロジェクトを設定
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
          <CardDescription>
            プロジェクトの基本情報を入力してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>プロジェクト名 *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="例: Webサイトリニューアル"
                        {...field}
                        data-testid="input-project-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>説明</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="プロジェクトの簡単な説明..."
                        className="resize-none"
                        rows={3}
                        {...field}
                        data-testid="input-project-description"
                      />
                    </FormControl>
                    <FormDescription>
                      レビュアーがプロジェクトを理解するための任意の説明
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>クライアント名</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="例: 株式会社サンプル"
                        {...field}
                        data-testid="input-client-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>期限日</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        data-testid="input-due-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/projects")}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-create-project"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      作成中...
                    </>
                  ) : (
                    "Create Project"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
