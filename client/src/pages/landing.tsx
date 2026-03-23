import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  Link2, 
  MessageSquare, 
  FileVideo, 
  FileImage, 
  FileText,
  Layers,
  CheckCircle,
  Share2,
  Users,
  Clock,
  Sparkles
} from "lucide-react";
import companyLogo from "@assets/logo_1769149128186.png";

export default function Landing() {
  const supportedFormats = [
    { ext: ".mp4", category: "video" },
    { ext: ".mov", category: "video" },
    { ext: ".pdf", category: "document" },
    { ext: ".png", category: "image" },
    { ext: ".jpeg", category: "image" },
    { ext: ".ai", category: "design" },
    { ext: ".psd", category: "design" },
    { ext: ".docx", category: "document" },
    { ext: ".xlsx", category: "document" },
    { ext: ".pptx", category: "document" },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-30"></div>
        
        <div className="container mx-auto px-6 py-20 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <img 
              src={companyLogo} 
              alt="Company Logo" 
              className="h-14 md:h-16 object-contain mx-auto mb-4 brightness-0 invert"
            />
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              CheckBack
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8">
              デザインレビュー＆フィードバック管理プラットフォーム
            </p>
            <p className="text-lg text-blue-200 mb-10 max-w-2xl mx-auto">
              確認工数を劇的に削減し、納期短縮・品質向上・コスト削減を実現
            </p>
            <Link href="/projects">
              <Button 
                size="lg" 
                variant="secondary"
                data-testid="button-get-started"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Section 01: Main Features */}
      <section className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white py-20">
        <div className="container mx-auto px-6">
          <div className="flex items-start gap-6 mb-12">
            <span className="text-6xl md:text-7xl font-bold text-blue-200/50">01</span>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2">
                確認工数を劇的に削減し、
              </h2>
              <p className="text-xl md:text-2xl text-blue-100">
                納期短縮・品質向上・コスト削減を実現
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Quick Check Feature */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 hover-elevate" data-testid="card-feature-quickcheck">
              <div className="aspect-video bg-white/20 rounded-lg mb-6 flex items-center justify-center overflow-hidden">
                <div className="bg-white rounded-lg p-4 w-full h-full flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm text-gray-600 font-medium">クイックチェックを始めましょう</span>
                  </div>
                  <div className="flex-1 grid grid-cols-4 gap-2">
                    <div className="bg-gray-100 rounded aspect-square"></div>
                    <div className="bg-gray-100 rounded aspect-square"></div>
                    <div className="bg-gray-100 rounded aspect-square"></div>
                    <div className="bg-gray-100 rounded aspect-square"></div>
                  </div>
                </div>
              </div>
              <h3 className="text-xl font-bold text-center">クイックチェック機能</h3>
              <p className="text-blue-100 text-center mt-2 text-sm">
                ファイルをアップロードして即座にレビューを開始
              </p>
            </div>

            {/* CheckBack Feature */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 hover-elevate" data-testid="card-feature-checkback">
              <div className="aspect-video bg-gradient-to-br from-orange-400 to-pink-500 rounded-lg mb-6 flex items-center justify-center overflow-hidden relative">
                <div className="absolute inset-0 bg-black/30"></div>
                <span className="text-white text-2xl font-bold z-10">Challenge</span>
                <div className="absolute bottom-2 left-2 right-2 flex gap-1">
                  <div className="bg-white/30 h-1 flex-1 rounded"></div>
                  <div className="bg-white h-1 flex-1 rounded"></div>
                  <div className="bg-white/30 h-1 flex-1 rounded"></div>
                </div>
              </div>
              <h3 className="text-xl font-bold text-center">チェックバック機能</h3>
              <p className="text-blue-100 text-center mt-2 text-sm">
                座標ベースのピンでフィードバックを的確に伝達
              </p>
            </div>

            {/* Compare Feature */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 hover-elevate" data-testid="card-feature-compare">
              <div className="aspect-video bg-gradient-to-br from-purple-400 to-indigo-500 rounded-lg mb-6 flex items-center justify-center overflow-hidden relative">
                <div className="absolute inset-0 flex">
                  <div className="w-1/2 bg-gradient-to-br from-orange-300 to-pink-400 flex items-center justify-center">
                    <span className="text-white font-bold">Challenge</span>
                  </div>
                  <div className="w-1/2 bg-gradient-to-br from-blue-300 to-purple-400 flex items-center justify-center">
                    <span className="text-white font-bold">Challenge</span>
                  </div>
                </div>
                <div className="absolute top-2 right-2 bg-white/90 rounded px-2 py-1 text-xs text-gray-700">
                  比較モード
                </div>
              </div>
              <h3 className="text-xl font-bold text-center">見比べ機能</h3>
              <p className="text-blue-100 text-center mt-2 text-sm">
                バージョン間の差異を視覚的に比較検証
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 02: Link Sharing */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-700 text-white py-20" data-testid="section-link-sharing">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1">
              <div className="flex items-start gap-6 mb-8">
                <span className="text-6xl md:text-7xl font-bold text-blue-200/50">02</span>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-2">
                    リンク共有で、
                  </h2>
                  <p className="text-xl md:text-2xl">
                    すぐにフィードバックが集まる
                  </p>
                </div>
              </div>
              <p className="text-blue-100 text-lg">
                リンクを共有するだけで、関係者のレビューが<br />
                どんどん集まる
              </p>
            </div>

            <div className="flex-1 flex justify-center">
              <div className="relative">
                {/* Document with link icon */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 relative">
                  <div className="w-48 h-64 bg-white/20 rounded-lg flex items-center justify-center relative">
                    <FileText className="w-16 h-16 text-white/60" />
                    <div className="absolute -top-4 -right-4 w-12 h-12 bg-blue-400 rounded-full flex items-center justify-center shadow-lg">
                      <Link2 className="w-6 h-6 text-white" />
                    </div>
                    {/* Curved arrow */}
                    <div className="absolute -right-20 top-1/2 transform -translate-y-1/2">
                      <Share2 className="w-10 h-10 text-blue-300" />
                    </div>
                  </div>
                </div>

                {/* Chat bubbles */}
                <div className="absolute -bottom-8 -right-16 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center">
                        <Users className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-white/20 rounded-lg px-3 py-1.5">
                        <MessageSquare className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <div className="w-6 h-6 rounded-full bg-green-400"></div>
                      <div className="bg-white/20 rounded-lg px-3 py-1.5">
                        <span className="text-xs text-white">フィードバック</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 03: Supported File Formats */}
      <section className="bg-gradient-to-br from-blue-700 to-indigo-800 text-white py-20" data-testid="section-file-formats">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1">
              <div className="flex items-start gap-6 mb-8">
                <span className="text-6xl md:text-7xl font-bold text-blue-200/50">03</span>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-2">
                    動画・デザイン・資料など、
                  </h2>
                  <p className="text-xl md:text-2xl">
                    主要ファイル形式に対応。
                  </p>
                </div>
              </div>
              <p className="text-blue-100 text-lg">
                あらゆる制作物をまとめてチェックできます。
              </p>
            </div>

            <div className="flex-1 flex justify-center">
              <div className="relative">
                {/* Document with checkmark */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                  <div className="relative">
                    <div className="w-48 bg-white rounded-lg p-4 shadow-lg">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {supportedFormats.map((format, index) => (
                          <div 
                            key={index}
                            className="flex items-center gap-1 text-gray-700"
                          >
                            {format.category === "video" && <FileVideo className="w-3 h-3 text-blue-500" />}
                            {format.category === "image" && <FileImage className="w-3 h-3 text-green-500" />}
                            {format.category === "document" && <FileText className="w-3 h-3 text-orange-500" />}
                            {format.category === "design" && <Layers className="w-3 h-3 text-purple-500" />}
                            <span className="font-mono text-xs">{format.ext}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Checkmark badge */}
                    <div className="absolute -top-3 -right-3 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>

                {/* Decorative blob */}
                <div className="absolute -z-10 -top-8 -right-8 w-40 h-40 bg-blue-400/20 rounded-full blur-2xl"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-gradient-to-br from-indigo-800 to-purple-900 text-white py-20">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">CheckBackの特長</h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-blue-300" />
              </div>
              <h3 className="text-xl font-bold mb-2">納期短縮</h3>
              <p className="text-blue-200 text-sm">
                レビュープロセスを効率化し、プロジェクトの納期を大幅に短縮
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-300" />
              </div>
              <h3 className="text-xl font-bold mb-2">品質向上</h3>
              <p className="text-blue-200 text-sm">
                的確なフィードバックにより、デザインの品質を高める
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-yellow-300" />
              </div>
              <h3 className="text-xl font-bold mb-2">コスト削減</h3>
              <p className="text-blue-200 text-sm">
                無駄な修正を減らし、制作コストを最適化
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">今すぐCheckBackを始めましょう</h2>
          <p className="text-blue-100 mb-8 max-w-xl mx-auto">
            デザインレビューのワークフローを革新し、チームのコラボレーションを加速させます
          </p>
          <Link href="/projects">
            <Button 
              size="lg" 
              variant="secondary"
              data-testid="button-start-now"
            >
              Start Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="container mx-auto px-6 text-center">
          <p className="text-sm">© 2026 CheckBack. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
