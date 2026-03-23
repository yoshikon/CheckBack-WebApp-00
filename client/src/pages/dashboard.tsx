import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FolderOpen,
  MessageSquare,
  FileImage,
  Plus,
  ArrowRight,
  Clock,
} from "lucide-react";
import type { ProjectWithFiles } from "@shared/schema";

export default function DashboardPage() {
  const { data: projects, isLoading } = useQuery<ProjectWithFiles[]>({
    queryKey: ["/api/projects"],
  });

  const recentProjects = projects?.slice(0, 4) || [];

  const stats = {
    totalProjects: projects?.length || 0,
    totalFiles: projects?.reduce((sum, p) => sum + (p.fileCount || 0), 0) || 0,
    totalComments: projects?.reduce((sum, p) => sum + (p.commentCount || 0), 0) || 0,
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            お帰りなさい！レビュー活動の概要をご確認ください。
          </p>
        </div>
        <Link href="/projects/new">
          <Button data-testid="button-new-project-dashboard">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              プロジェクト数
            </CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold">{stats.totalProjects}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ファイル数
            </CardTitle>
            <FileImage className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold">{stats.totalFiles}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              コメント数
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold">{stats.totalComments}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">最近のプロジェクト</h2>
          <Link href="/projects">
            <Button variant="ghost" size="sm" data-testid="link-view-all-projects">
              すべて表示
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : recentProjects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <FolderOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-1">プロジェクトがありません</h3>
              <p className="text-muted-foreground mb-4 max-w-sm">
                最初のプロジェクトを作成して、デザインへのフィードバック収集を始めましょう。
              </p>
              <Link href="/projects/new">
                <Button data-testid="button-create-first-project">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Project
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {recentProjects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="h-full hover-elevate cursor-pointer transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <CardTitle className="text-lg truncate" data-testid={`text-project-name-${project.id}`}>
                          {project.name}
                        </CardTitle>
                        {project.clientName && (
                          <CardDescription className="truncate">
                            {project.clientName}
                          </CardDescription>
                        )}
                      </div>
                      {project.dueDate && (
                        <Badge variant="outline" className="flex-shrink-0">
                          <Clock className="mr-1 h-3 w-3" />
                          {new Date(project.dueDate).toLocaleDateString()}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <FileImage className="h-4 w-4" />
                        <span>{project.fileCount || 0} ファイル</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        <span>{project.commentCount || 0} コメント</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
