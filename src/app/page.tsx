"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Sword, Users, Play, UserCircle, BookOpen, X } from "lucide-react";
import { createRoom, joinRoom } from "@/lib/gameLogic";
import { RulesModal } from "@/components/RulesModal";

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
      {/* Rules Modal */}
      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
    </div>
  );
}
