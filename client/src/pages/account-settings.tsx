import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Loader as Loader2, ArrowLeft } from "lucide-react";

export default function AccountSettings() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { displayName: string }) => {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to update profile");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "プロフィールを更新しました",
        description: "変更が正常に保存されました。",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "エラーが発生しました",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await fetch("/api/user/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to update password");
      }

      return response.json();
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: "パスワードを更新しました",
        description: "新しいパスワードで再ログインしてください。",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "エラーが発生しました",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({ displayName });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: "エラー",
        description: "新しいパスワードが一致しません。",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "エラー",
        description: "パスワードは6文字以上で入力してください。",
        variant: "destructive",
      });
      return;
    }

    updatePasswordMutation.mutate({ currentPassword, newPassword });
  };

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => setLocation("/home")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          戻る
        </Button>
        <h1 className="text-3xl font-bold">アカウント設定</h1>
        <p className="text-muted-foreground mt-2">
          プロフィールとセキュリティ設定を管理します。
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>プロフィール情報</CardTitle>
            <CardDescription>
              表示名やその他のプロフィール情報を更新できます。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">ユーザー名</Label>
                <Input
                  id="username"
                  value={user?.username || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  ユーザー名は変更できません。
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  メールアドレスは変更できません。
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">表示名</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="表示名を入力"
                />
              </div>

              <Button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="w-full sm:w-auto"
              >
                {updateProfileMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                プロフィールを更新
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>パスワード変更</CardTitle>
            <CardDescription>
              アカウントのセキュリティを保護するためにパスワードを更新します。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">現在のパスワード</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="現在のパスワードを入力"
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="newPassword">新しいパスワード</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="新しいパスワードを入力"
                />
                <p className="text-xs text-muted-foreground">
                  6文字以上で入力してください。
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">新しいパスワード(確認)</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="新しいパスワードを再入力"
                />
              </div>

              <Button
                type="submit"
                disabled={
                  updatePasswordMutation.isPending ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmPassword
                }
                className="w-full sm:w-auto"
              >
                {updatePasswordMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                パスワードを更新
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
