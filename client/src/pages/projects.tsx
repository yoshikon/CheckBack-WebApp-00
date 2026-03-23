import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FolderOpen,
  Plus,
  Search,
  FileImage,
  MessageSquare,
  Clock,
  Calendar,
} from "lucide-react";
import { useState } from "react";
import type { ProjectWithFiles } from "@shared/schema";

export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: projects, isLoading } = useQuery<ProjectWithFiles[]>({
    queryKey: ["/api/projects"],
  });

  const filteredProjects = projects?.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.clientName?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            デザインレビュープロジェクトを管理
          </p>
        </div>
        <Link href="/projects/new">
          <Button data-testid="button-new-project-page">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="プロジェクトを検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-search-projects"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <FolderOpen className="h-10 w-10 text-muted-foreground" />
            </div>
            {searchQuery ? (
              <>
                <h3 className="font-semibold text-lg mb-1">検索結果がありません</h3>
                <p className="text-muted-foreground max-w-sm">
                  「{searchQuery}」に一致するプロジェクトが見つかりません。別の検索語をお試しください。
                </p>
              </>
            ) : (
              <>
                <h3 className="font-semibold text-lg mb-1">プロジェクトがありません</h3>
                <p className="text-muted-foreground mb-4 max-w-sm">
                  最初のプロジェクトを作成して、デザインへのフィードバック収集を始めましょう。
                </p>
                <Link href="/projects/new">
                  <Button data-testid="button-create-project-empty">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Project
                  </Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="h-full hover-elevate cursor-pointer transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg line-clamp-1" data-testid={`text-project-${project.id}`}>
                      {project.name}
                    </CardTitle>
                  </div>
                  {project.clientName && (
                    <CardDescription className="line-clamp-1">
                      {project.clientName}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <FileImage className="h-4 w-4" />
                      <span>{project.fileCount || 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="h-4 w-4" />
                      <span>{project.commentCount || 0}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    {project.dueDate && (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="mr-1 h-3 w-3" />
                        期限: {formatDate(project.dueDate)}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-xs">
                      <Calendar className="mr-1 h-3 w-3" />
                      {formatDate(project.createdAt?.toString() || new Date().toISOString())}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
