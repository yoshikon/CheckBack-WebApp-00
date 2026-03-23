import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader as Loader2, CircleCheck as CheckCircle2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import companyLogo from "@assets/logo_1769149128186.png";

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }

    if (password.length < 6) {
      setError("パスワードは6文字以上で入力してください");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, displayName, email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          setLocation("/login");
        }, 2000);
      } else {
        setError(data.error || "ユーザー登録に失敗しました");
      }
    } catch (err) {
      setError("ネットワークエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <h2 className="text-2xl font-bold">登録完了</h2>
              <p className="text-muted-foreground">
                アカウントの登録が完了しました。ログインページに移動します...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="absolute top-0 right-0 p-4">
        <ThemeToggle />
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center text-center space-y-3">
            <img
              src={companyLogo}
              alt="Company Logo"
              className="h-12 object-contain"
            />
            <h1 className="text-3xl font-bold tracking-tight">CheckBack</h1>
            <p className="text-muted-foreground">
              デザインレビュー＆フィードバック管理
            </p>
          </div>

          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">新規登録</CardTitle>
              <CardDescription>
                新しいアカウントを作成してください
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="username">ユーザー名 *</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="ユーザー名を入力"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                  />
                  <p className="text-xs text-muted-foreground">
                    ログイン時に使用します
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName">表示名</Label>
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="表示名を入力(任意)"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    autoComplete="name"
                  />
                  <p className="text-xs text-muted-foreground">
                    コメント等で表示される名前です
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">メールアドレス</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com(任意)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">パスワード *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="パスワードを入力"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pr-10"
                      autoComplete="new-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    6文字以上で入力してください
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">パスワード確認 *</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="パスワードを再入力"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="pr-10"
                      autoComplete="new-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      登録中...
                    </>
                  ) : (
                    "新規登録"
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  既にアカウントをお持ちの場合は{" "}
                  <Link href="/login" className="text-primary hover:underline font-medium">
                    ログイン
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <footer className="py-4 text-center text-sm text-muted-foreground">
        <p>CheckBack - デザインレビュープラットフォーム</p>
      </footer>
    </div>
  );
}
