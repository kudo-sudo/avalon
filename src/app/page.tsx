"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Sword, Users, Play, UserCircle, BookOpen, X } from "lucide-react";
import { createRoom, joinRoom } from "@/lib/gameLogic";

export default function Home() {
  const [roomId, setRoomId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const router = useRouter();

  const handleCreate = async () => {
    if (!playerName) {
      alert("名前を入力してください");
      return;
    }
    setLoading(true);
    try {
      const id = await createRoom(playerName);
      router.push(`/room/${id}`);
    } catch (e: any) {
      console.error(e);
      alert("ルーム作成に失敗しました：\n" + (e.message || "原因不明のエラー"));
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!playerName || !roomId) {
      alert("名前とルームIDを入力してください");
      return;
    }
    setLoading(true);
    try {
      await joinRoom(roomId, playerName);
      router.push(`/room/${roomId.toUpperCase()}`);
    } catch (e: any) {
      alert(e.message || "エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-[radial-gradient(circle_at_center,_var(--secondary)_0%,_var(--background)_100%)]">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-accent/20 rounded-full blur-3xl"></div>
      </div>

      <main className="relative z-10 w-full max-w-md space-y-8 text-center">
        {/* Logo/Title Section */}
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <Shield className="w-24 h-24 text-primary animate-pulse" />
              <Sword className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 text-foreground/80 opacity-50" />
            </div>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-primary italic uppercase sm:text-6xl drop-shadow-2xl">
            Avalon
          </h1>
          <p className="text-sm font-medium tracking-[0.3em] uppercase text-foreground/60">
            The Resistance: Online
          </p>
        </div>

        {/* Player Name Section */}
        <div className="avalon-card space-y-4 border-primary/30">
          <h2 className="text-xl font-bold flex items-center justify-center gap-2 text-primary">
            <UserCircle className="w-5 h-5" /> プレイヤー名
          </h2>
          <input
            type="text"
            placeholder="あなたの名前"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-center text-lg outline-none focus:border-primary/50"
          />
        </div>

        {/* Action Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="avalon-card space-y-4 flex flex-col justify-between">
            <h2 className="text-sm font-bold flex items-center justify-center gap-2 opacity-70">
              <Users className="w-4 h-4" /> 遠征隊を編成
            </h2>
            <button 
              className="avalon-btn w-full text-sm py-2"
              onClick={handleCreate}
              disabled={loading || !playerName}
            >
              {loading ? "作成中..." : "ルーム作成"}
            </button>
          </div>

          <div className="avalon-card space-y-4">
            <h2 className="text-sm font-bold flex items-center justify-center gap-2 opacity-70">
              <Play className="w-4 h-4" /> ゲームに参加
            </h2>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-center text-sm outline-none focus:border-primary/50"
              />
              <button 
                className="avalon-btn w-full text-sm py-2"
                onClick={handleJoin}
                disabled={loading || !playerName || !roomId}
              >
                参加
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <footer className="pt-4 flex flex-col items-center gap-4 text-xs text-foreground/40 font-medium tracking-wide">
          <button 
            onClick={() => setShowRules(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 hover:border-primary/50 hover:text-primary transition-all bg-black/50"
          >
            <BookOpen className="w-4 h-4" /> ルール説明を読む
          </button>
          <div className="text-center">
            <p>Created for University Project</p>
            <p className="mt-1">© 2026 Avalon Team</p>
          </div>
        </footer>
      </main>

      {/* Rules Modal */}
      {showRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-background border border-primary/30 rounded-2xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto avalon-card">
            <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-4">
              <h2 className="text-2xl font-black italic text-primary uppercase flex items-center gap-2">
                <Shield className="w-6 h-6" /> How to Play
              </h2>
              <button 
                onClick={() => setShowRules(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-6 text-sm leading-relaxed text-foreground/80">
              <section>
                <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-widest border-l-2 border-primary pl-3">概要</h3>
                <p>プレイヤーは「アーサー卿の忠臣（正義）」と「モードレッドの配下（邪悪）」に分かれます。<br/>正義陣営は<strong className="text-blue-400">3回の遠征を成功させる</strong>こと、邪悪陣営は<strong className="text-accent">3回の遠征を失敗させる</strong>ことが目的です。</p>
              </section>

              <section>
                <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-widest border-l-2 border-primary pl-3">役職について</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                    <h4 className="font-bold text-blue-400 mb-1">🛡️ 正義陣営（青色）</h4>
                    <ul className="list-disc list-inside space-y-1 ml-1">
                      <li><strong>マーリン</strong>: 邪悪陣営の正体を知っています。ただし、正体がバレてはいけません。</li>
                      <li><strong>パーシヴァル</strong>: 「本物のマーリン」と「偽物（モルガナ）」の2人が見えます。見極めて守りましょう。</li>
                      <li><strong>忠実なる家来</strong>: 能力を持たない一般市民です。</li>
                    </ul>
                  </div>
                  <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                    <h4 className="font-bold text-accent mb-1">😈 邪悪陣営（赤色）</h4>
                    <p className="text-xs mb-2 opacity-80">お互いに誰が仲間か知っています（オベロンを除く）。</p>
                    <ul className="list-disc list-inside space-y-1 ml-1">
                      <li><strong>アサシン</strong>: 最後の一撃の権利を持ちます。正義が3勝しても「マーリン」を言い当てて暗殺できれば逆転勝利です。</li>
                      <li><strong>モルガナ</strong>: パーシヴァルに対して「マーリン」のフリをして見えます。</li>
                      <li><strong>モルドレッド</strong>: マーリンから正体が見えません（正義側に見えます）。</li>
                      <li><strong>オベロン</strong>: 仲間が誰か分からず、仲間からも味方だと分かりません。</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-widest border-l-2 border-primary pl-3">ゲームの流れ</h3>
                <ol className="list-decimal list-inside space-y-3 ml-1">
                  <li><strong>遠征隊の編成</strong>: リーダーが遠征に行くメンバーを指名します。</li>
                  <li><strong>投票</strong>: 全員で指名されたメンバーで遠征に行くかに「承認/反対」で投票します。（<span className="text-accent text-xs">※5回連続否決で邪悪の勝利</span>）</li>
                  <li><strong>遠征ミッション</strong>: 選ばれたメンバーが秘密裏に「成功/失敗」を出します。正義陣営は必ず「成功」を、邪悪陣営はどちらでも出せます。1枚でも「失敗」があればミッション失敗です。</li>
                  <li><strong>暗殺フェーズ</strong>: 正義が3勝した場合に行われます。アサシンがマーリンを暗殺できれば邪悪側の逆転勝利です。</li>
                </ol>
              </section>
            </div>
            
            <div className="mt-6 pt-4 border-t border-white/10 text-center">
              <button 
                onClick={() => setShowRules(false)}
                className="avalon-btn px-8 py-2"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
