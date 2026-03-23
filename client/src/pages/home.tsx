import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MessageSquare, 
  FileImage, 
  ExternalLink, 
  FolderOpen, 
  Plus, 
  ArrowRight, 
  Clock 
} from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import type { File, Project, ProjectWithFiles } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

interface RecentlyViewedFile {
  fileId: string;
  viewedAt: string;
}

interface FileWithProject extends File {
  project?: Project;
}

export default function HomePage() {
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<RecentlyViewedFile[]>([]);

  const { data: projects, isLoading: isLoadingProjects } = useQuery<ProjectWithFiles[]>({
    queryKey: ["/api/projects"],
  });

  useEffect(() => {
    const stored = localStorage.getItem("checkback-recently-viewed");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setRecentlyViewedIds(parsed.slice(0, 10));
      } catch {
        setRecentlyViewedIds([]);
      }
    }
  }, []);

  const idsParam = recentlyViewedIds.map(r => r.fileId).join(",");
  
  const { data: recentFiles, isLoading: isLoadingFiles } = useQuery<FileWithProject[]>({
    queryKey: [`/api/files/recent?ids=${idsParam}`],
    enabled: recentlyViewedIds.length > 0,
  });

  const getFileWithViewTime = (file: FileWithProject) => {
    const viewRecord = recentlyViewedIds.find(r => r.fileId === file.id);
    return {
      ...file,
      viewedAt: viewRecord?.viewedAt ? new Date(viewRecord.viewedAt) : new Date(),
    };
  };

  const sortedRecentFiles = recentFiles
    ?.map(getFileWithViewTime)
    .sort((a, b) => b.viewedAt.getTime() - a.viewedAt.getTime()) || [];

  const recentProjects = projects?.slice(0, 4) || [];

  const stats = {
    totalProjects: projects?.length || 0,
    totalFiles: projects?.reduce((sum, p) => sum + (p.fileCount || 0), 0) || 0,
    totalComments: projects?.reduce((sum, p) => sum + (p.commentCount || 0), 0) || 0,
  };

  return (
    <div className="space-y-8" data-testid="page-home">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-home-title">Home</h1>
          <p className="text-muted-foreground" data-testid="text-home-description">
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
            {isLoadingProjects ? (
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
            {isLoadingProjects ? (
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
            {isLoadingProjects ? (
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

        {isLoadingProjects ? (
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

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex flex-wrap items-center gap-2" data-testid="text-section-recent-talks">
            <MessageSquare className="h-5 w-5 text-primary" />
            最近のトーク
          </h2>
          <Card data-testid="card-recent-talks-empty">
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground" data-testid="text-no-recent-talks">
                最近のトークはありません
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex flex-wrap items-center gap-2" data-testid="text-section-recent-files">
            <FileImage className="h-5 w-5 text-primary" />
            最近閲覧したファイル
          </h2>

          {isLoadingFiles ? (
            <div className="space-y-3" data-testid="skeleton-recent-files">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="py-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <Skeleton className="rounded" style={{ width: "3rem", height: "3rem" }} />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : sortedRecentFiles.length === 0 ? (
            <Card data-testid="card-recent-files-empty">
              <CardContent className="py-12 text-center">
                <FileImage className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground" data-testid="text-no-recent-files">
                  最近閲覧したファイルはありません
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  プロジェクト内のファイルを開くと、ここに表示されます。
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3" data-testid="list-recent-files">
              {sortedRecentFiles.map((file) => (
                <Link key={file.id} href={`/files/${file.id}`}>
                  <Card className="hover-elevate cursor-pointer transition-colors" data-testid={`card-recent-file-${file.id}`}>
                    <CardContent className="py-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <div 
                          className="rounded overflow-hidden bg-muted flex items-center justify-center flex-shrink-0"
                          style={{ width: "3rem", height: "3rem" }}
                        >
                          {file.thumbnailUrl || file.url ? (
                            (file.mimeType ?? "").startsWith("image/") ? (
                              <img
                                src={file.thumbnailUrl || file.url || undefined}
                                alt={file.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <FileImage className="h-5 w-5 text-muted-foreground" />
                            )
                          ) : (
                            <FileImage className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-muted-foreground" data-testid={`text-file-viewed-at-${file.id}`}>
                              最終閲覧：{formatDistanceToNow(file.viewedAt, { addSuffix: true, locale: ja })}
                            </span>
                          </div>
                          <p className="font-medium truncate" data-testid={`text-file-name-${file.id}`}>
                            {file.name}
                          </p>
                          {file.project && (
                            <p className="text-sm text-muted-foreground truncate" data-testid={`text-file-project-${file.id}`}>
                              in: {file.project.name}
                            </p>
                          )}
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
