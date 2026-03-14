"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Shield, Sword, Users, Crown, ShieldAlert, ArrowLeft, Play } from "lucide-react";
import { subscribeRoom, Room, Player, getPlayerId, startGame, getSecretInfo, proposeTeam, voteOnTeam, submitMissionVote, assassinateMerlin, ROLES } from "@/lib/gameLogic";

export default function RoomPage() {
  const { id } = useParams();
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [localSelectedTeam, setLocalSelectedTeam] = useState<string[]>([]);

  useEffect(() => {
    getPlayerId().then(setMyId);

    const unsubscribe = subscribeRoom(id as string, (updatedRoom) => {
      setRoom(updatedRoom);
      // リーダー交代時やフェーズ移行時に選択を一旦リセット
      setLocalSelectedTeam([]);
    });

    return () => unsubscribe();
  }, [id]);

  const handleStartGame = async () => {
    setStarting(true);
    try {
      await startGame(id as string);
    } catch (e) {
      alert("開始に失敗しました。");
    } finally {
      setStarting(false);
    }
  };

  if (!room) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-primary animate-pulse font-bold text-2xl uppercase tracking-widest">
          Loading Room...
        </div>
      </div>
    );
  }

  //  // --- 勝利画面（ended）---
  if (room.status === 'ended') {
    const isEvilWin = room.winner === 'Evil';
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <div className={`text-6xl mb-6 ${isEvilWin ? 'animate-bounce' : 'animate-pulse'}`}>
          {isEvilWin ? '😈' : '🛡️'}
        </div>
        <h1 className={`text-5xl font-black italic uppercase mb-2 ${isEvilWin ? 'text-accent' : 'text-blue-500'}`}>
          {isEvilWin ? 'Evil Wins' : 'Good Wins'}
        </h1>
        <p className="text-foreground/60 mb-12 tracking-widest uppercase font-bold">
          {isEvilWin ? '邪悪な軍勢が勝利しました' : 'アーサー卿の忠臣が勝利しました'}
        </p>

        <div className="avalon-card w-full max-w-md bg-white/5 border-white/10 mb-12">
          <h2 className="text-xs font-bold uppercase tracking-widest text-primary mb-4">Roles Reveal</h2>
          <div className="grid gap-2 text-left">
            {room.players.map(p => (
              <div key={p.id} className="flex justify-between items-center text-sm border-b border-white/5 py-2">
                <span className="font-medium">{p.name}</span>
                <span className={`font-black uppercase text-[10px] ${
                  [ROLES.ASSASSIN, ROLES.MORGANA, ROLES.MORDRED, ROLES.OBERON, ROLES.MINION].includes(p.role as any) 
                  ? 'text-accent' : 'text-blue-400'
                }`}>
                  {p.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        <button 
          onClick={() => router.push("/")}
          className="avalon-btn px-12"
        >
          Back to Menu
        </button>
      </div>
    );
  }

  // --- 暗殺フェーズ（assassination）---
  if (room.status === 'assassination') {
    const me = room.players.find(p => p.id === myId);
    const isAssassin = me?.role === ROLES.ASSASSIN;
    
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <div className="w-full max-w-2xl">
          <ShieldAlert className="w-16 h-16 text-accent mx-auto mb-6 animate-pulse" />
          <h1 className="text-4xl font-black italic text-accent uppercase mb-2">Assassination</h1>
          <p className="text-sm text-foreground/60 mb-12">
            3つのミッションが成功しましたが、まだ終わりではありません。<br />
            アサシンが「マーリン」を正しく暗殺すれば、邪悪な軍勢の逆転勝利となります。
          </p>

          <div className="avalon-card border-accent/40 bg-accent/5 py-12">
            {!isAssassin ? (
              <div className="space-y-4">
                <p className="text-xl font-bold">アサシンの決断を待っています...</p>
                <p className="text-xs opacity-60">正義の陣営は正体がバレないよう祈りましょう。</p>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-xl font-bold text-accent">マーリンだと思うプレイヤーを選んでください</p>
                <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                  {room.players
                    .filter(p => p.role !== ROLES.ASSASSIN) // 自分以外
                    .map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          if (confirm(`${p.name} を暗殺しますか？`)) {
                            assassinateMerlin(room.id, p.id);
                          }
                        }}
                        className="p-4 rounded-xl border border-accent/20 bg-accent/10 text-accent font-bold hover:bg-accent hover:text-white transition-all"
                      >
                        {p.name}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- ゲーム中表示 ---
  if (room.status === 'playing') {
    const me = room.players.find(p => p.id === myId);
    const myRole = me?.role;
    const secretInfo = me ? getSecretInfo(me, room.players) : [];
    const isLeader = room.players[room.currentLeaderIndex].id === myId;
    const leaderName = room.players[room.currentLeaderIndex].name;
    const isSelected = room.proposedTeam?.includes(myId || "");

    return (
      <div className="flex min-h-screen flex-col bg-background p-4 sm:p-8">
        {/* Header: Mission Status */}
        <div className="max-w-4xl mx-auto w-full mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-black italic text-primary uppercase">Mission Progress</h1>
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase font-bold text-foreground/40">Failed Votes</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className={`w-3 h-3 rounded-full border ${i <= room.failedVotes ? 'bg-accent border-accent animate-pulse' : 'border-white/20'}`} />
                ))}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-5 gap-2 sm:gap-4">
            {[1, 2, 3, 4, 5].map((round) => {
              const result = room.missionResults[round - 1];
              return (
                <div key={round} className={`avalon-card p-3 flex flex-col items-center justify-center gap-2 border-2 ${
                  round === room.currentRound ? 'border-primary shadow-[0_0_10px_var(--primary)]' : 'border-white/5'
                }`}>
                  <span className="text-[10px] font-bold opacity-40">M{round}</span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    result === 'success' ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)]' :
                    result === 'fail' ? 'bg-accent shadow-[0_0_15px_rgba(220,38,38,0.5)]' :
                    'bg-white/5'
                  }`}>
                    {result === 'success' && <Shield className="w-4 h-4 text-white" />}
                    {result === 'fail' && <Sword className="w-4 h-4 text-white" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <main className="flex-1 max-w-4xl mx-auto w-full grid gap-8 md:grid-cols-3">
          {/* Left Column: Your Role & Info */}
          <div className="space-y-6">
            <div className="avalon-card border-primary/40 bg-primary/5">
              <p className="text-[10px] uppercase tracking-widest text-primary font-bold mb-1">Your Identity</p>
              <h2 className="text-2xl font-black text-white mb-4">{myRole}</h2>
              
              {secretInfo.length > 0 && (
                <div className="pt-4 border-t border-white/10">
                  <p className="text-[10px] uppercase tracking-widest text-primary font-bold mb-2">Knowledge</p>
                  <ul className="text-xs space-y-1.5 opacity-80">
                    {secretInfo.map((info, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-primary rounded-full shadow-[0_0_5px_var(--primary)]" />
                        {info}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="avalon-card">
              <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-3 flex items-center gap-2">
                <Users className="w-3 h-3" /> Players
              </h3>
              <div className="space-y-2">
                {room.players.map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${i === room.currentLeaderIndex ? 'bg-primary shadow-[0_0_8px_var(--primary)]' : 'bg-transparent'}`} />
                      <span className={p.id === myId ? 'text-primary font-bold' : 'opacity-70'}>{p.name}</span>
                    </div>
                    {i === room.currentLeaderIndex && <Crown className="w-3 h-3 text-primary" />}
                    {room.proposedTeam?.includes(p.id) && (
                      <span className="text-[10px] font-black uppercase bg-primary/20 text-primary px-1.5 py-0.5 rounded ml-2">Team</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Middle/Right: Action Phase */}
          <div className="md:col-span-2 space-y-6">
            <div className="avalon-card min-h-[300px] flex flex-col justify-between border-primary/20">
              {/* Proposing Phase */}
              {room.phase === 'proposing' && (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                  <Users className="w-16 h-16 text-primary/40 mb-4" />
                  <h3 className="text-2xl font-bold mb-2">
                    {isLeader ? "Team Selection" : "Waiting for Leader"}
                  </h3>
                  <p className="text-sm text-foreground/60 mb-8">
                    {isLeader 
                      ? `${room.teamSize}人のメンバーを選んで遠征隊を編成してください。` 
                      : `${leaderName}（リーダー）がメンバーを選んでいます。`}
                  </p>

                  {isLeader && (
                    <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                      {room.players.map(p => {
                        const isSelectedInLocal = localSelectedTeam.includes(p.id);
                        return (
                          <button
                            key={p.id}
                            onClick={() => {
                              const next = isSelectedInLocal 
                                ? localSelectedTeam.filter(id => id !== p.id) 
                                : [...localSelectedTeam, p.id];
                              if (next.length <= room.teamSize) {
                                setLocalSelectedTeam(next);
                              }
                            }}
                            className={`p-3 rounded-lg border text-sm font-bold transition-all ${
                              isSelectedInLocal 
                                ? 'bg-primary text-black border-primary' 
                                : 'bg-white/5 border-white/10 text-white hover:border-primary/50'
                            }`}
                          >
                            {p.name} {p.id === myId && "(You)"}
                          </button>
                        );
                      })}
                      <button 
                         className="col-span-2 avalon-btn mt-4 shadow-[0_0_20px_rgba(212,175,55,0.3)]"
                         disabled={localSelectedTeam.length !== room.teamSize}
                         onClick={() => proposeTeam(room.id, localSelectedTeam)}
                      >
                        遠征隊を決定する
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Voting Phase */}
              {room.phase === 'voting' && (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                  <div className="flex gap-2 mb-6">
                    {room.proposedTeam?.map(pid => {
                      const name = room.players.find(p => p.id === pid)?.name;
                      return (
                        <div key={pid} className="avalon-card p-2 bg-primary/20 border-primary/40 text-xs font-bold text-primary">
                          {name}
                        </div>
                      );
                    })}
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Team Approval</h3>
                  <p className="text-sm text-foreground/60 mb-8">
                    このメンバーで遠征に行きますか？
                  </p>

                  {room.votes?.[myId || ""] ? (
                    <div className="text-primary font-bold animate-pulse">投票済み。結果を待っています...</div>
                  ) : (
                    <div className="flex gap-4 w-full max-w-sm">
                      <button 
                        className="flex-1 py-4 border-2 border-blue-600 text-blue-400 font-bold rounded-xl hover:bg-blue-600 hover:text-white transition-all uppercase"
                        onClick={() => voteOnTeam(room.id, myId!, 'approve')}
                      >
                        Approve (賛成)
                      </button>
                      <button 
                        className="flex-1 py-4 border-2 border-accent text-accent font-bold rounded-xl hover:bg-accent hover:text-white transition-all uppercase"
                        onClick={() => voteOnTeam(room.id, myId!, 'reject')}
                      >
                        Reject (反対)
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Mission Phase */}
              {room.phase === 'mission' && (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                  <h3 className="text-3xl font-black italic text-primary mb-2">THE MISSION</h3>
                  <p className="text-sm text-foreground/60 mb-8">
                    遠征メンバー：{room.proposedTeam?.map(pid => room.players.find(p => p.id === pid)?.name).join(", ")}
                  </p>

                  {isSelected ? (
                    room.missionVotes?.length === undefined || room.missionVotes.length < (room.proposedTeam?.length || 0) ? (
                      <div className="space-y-4 w-full max-w-sm">
                        <p className="text-xs uppercase font-bold tracking-widest text-accent mb-4">秘密の選択（慎重に！）</p>
                        <button 
                          className="w-full py-6 bg-blue-600/20 border-2 border-blue-600 text-blue-400 font-black text-xl rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)]"
                          onClick={() => submitMissionVote(room.id, 'success')}
                        >
                          SUCCESS (成功)
                        </button>
                        <button 
                          className="w-full py-6 bg-accent/20 border-2 border-accent text-accent font-black text-xl rounded-2xl hover:bg-accent hover:text-white transition-all shadow-[0_0_20px_rgba(220,38,38,0.2)]"
                          onClick={() => submitMissionVote(room.id, 'fail')}
                        >
                          FAIL (失敗)
                        </button>
                        <p className="text-[10px] text-foreground/40 mt-4">正義陣営は「成功」しか出せません。邪悪陣営はあえて「成功」を出して信用を稼いでも構いません。</p>
                      </div>
                    ) : (
                      <div className="text-primary font-bold">全員の決断を待っています...</div>
                    )
                  ) : (
                    <div className="py-12 flex flex-col items-center opacity-40">
                      <Shield className="w-12 h-12 mb-4 animate-pulse" />
                      <p className="text-sm font-bold">遠征の無事を祈っています...</p>
                      <p className="text-xs mt-1 italic leading-relaxed max-w-[200px]">選ばれたメンバーの「成功/失敗」の決断を待っています。</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button 
              onClick={() => router.push("/")}
              className="w-full text-foreground/20 hover:text-primary/40 transition-colors text-[10px] uppercase font-bold tracking-widest"
            >
              Exit to Main Menu
            </button>
          </div>
        </main>
      </div>
    );
  }

  // --- ロビー表示 ---
  const isHost = room.players.find(p => p.id === myId)?.isHost;

  return (
    <div className="flex min-h-screen flex-col bg-background p-4 sm:p-8">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <button 
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-foreground/60 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" /> 戻る
        </button>
        <div className="flex flex-col items-end">
          <span className="text-xs uppercase tracking-[0.2em] text-foreground/40 font-bold">Room ID</span>
          <span className="text-3xl font-black text-primary tracking-tighter">{room.id}</span>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full grid gap-8 md:grid-cols-3">
        {/* Left: Info & Game Start */}
        <div className="md:col-span-1 space-y-6">
          <div className="avalon-card border-primary/20">
            <h2 className="text-sm font-bold uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> ゲーム情報
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="opacity-60">参加人数</span>
                <span className="font-bold">{room.players.length} / 10</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="opacity-60">状態</span>
                <span className="text-green-500 font-bold uppercase">Ready</span>
              </div>
            </div>
            
            {isHost && (
              <button 
                className="avalon-btn w-full mt-6 flex items-center justify-center gap-2"
                onClick={handleStartGame}
                disabled={room.players.length < 5 || starting}
              >
                <Play className="w-4 h-4 fill-current" /> {starting ? "開始中..." : "ゲーム開始"}
              </button>
            )}
            {!isHost && (
              <p className="text-xs text-center mt-6 text-foreground/40 animate-pulse">
                ホストの開始を待っています...
              </p>
            )}
            {room.players.length < 5 && (
              <p className="text-[10px] text-center mt-2 text-accent italic">
                ※最低5人のプレイヤーが必要です
              </p>
            )}
          </div>
        </div>

        {/* Right: Player List */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-black uppercase tracking-tight">参加中のプレイヤー</h2>
          </div>
          
          <div className="grid gap-3">
            {room.players.map((player) => (
              <div 
                key={player.id}
                className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                  player.id === myId 
                    ? 'bg-primary/10 border-primary/40' 
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    player.isHost ? 'bg-primary text-black' : 'bg-secondary text-white'
                  }`}>
                    {player.name[0].toUpperCase()}
                  </div>
                  <span className={`font-bold ${player.id === myId ? 'text-primary' : ''}`}>
                    {player.name} {player.id === myId && "(あなた)"}
                  </span>
                </div>
                {player.isHost && (
                  <div className="flex items-center gap-1 text-[10px] font-black uppercase bg-primary/20 text-primary px-2 py-1 rounded">
                    <Crown className="w-3 h-3 text-primary" /> Host
                  </div>
                )}
              </div>
            ))}
            
            {/* Empty slots */}
            {Array.from({ length: Math.max(0, 5 - room.players.length) }).map((_, i) => (
              <div key={i} className="p-4 rounded-lg border border-dashed border-white/5 flex items-center justify-center opacity-20">
                <span className="text-xs uppercase font-bold tracking-widest text-center">空きスロット</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Background Graphic */}
      <div className="fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none opacity-50"></div>
    </div>
  );
}
