import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { Eye, EyeOff, Loader as Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import companyLogo from "@assets/logo_1769149128186.png";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const success = await login(username, password);
    
    if (success) {
      setLocation("/");
    } else {
      setError("ユーザー名またはパスワードが正しくありません");
    }
    
    setIsLoading(false);
  };

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
              <CardTitle className="text-2xl">Login</CardTitle>
              <CardDescription>
                アカウントにアクセスするための認証情報を入力してください
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
                  <Label htmlFor="username">ユーザー名</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="ユーザー名を入力"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    data-testid="input-username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">パスワード</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="パスワードを入力"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pr-10"
                      data-testid="input-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      data-testid="button-toggle-password"
                    >
                      {showPassword ? (
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
                  data-testid="button-login"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ログイン中...
                    </>
                  ) : (
                    "Login"
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  アカウントをお持ちでない場合は{" "}
                  <Link href="/register" className="text-primary hover:underline font-medium">
                    新規登録
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
