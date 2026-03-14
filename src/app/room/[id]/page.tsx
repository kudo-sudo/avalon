"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Shield, Sword, Users, Crown, ShieldAlert, ArrowLeft, Play, BookOpen, X, Check, XCircle, Settings } from "lucide-react";
import { subscribeRoom, Room, Player, getPlayerId, startGame, getSecretInfo, proposeTeam, voteOnTeam, submitMissionVote, assassinateMerlin, ROLES, proceedFromVoting, proceedFromMission, updateSelectedRoles, getTeamSize } from "@/lib/gameLogic";
import { RulesModal } from "@/components/RulesModal";

export default function RoomPage() {
  const { id } = useParams();
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [localSelectedTeam, setLocalSelectedTeam] = useState<string[]>([]);
  const [showRolesSettings, setShowRolesSettings] = useState(false);
  const [showRules, setShowRules] = useState(false);

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

    const isTwoFailsRequired = room.players.length >= 7 && room.currentRound === 4;
    const failsRequiredText = isTwoFailsRequired ? "このミッションは失敗カードが【2枚以上】で失敗となります" : "失敗カードが【1枚】でも出るとミッション失敗となります";

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
              const requiredPlayers = getTeamSize(room.players.length, round);
              return (
                <div key={round} className={`avalon-card p-3 flex flex-col items-center justify-center gap-2 border-2 ${
                  round === room.currentRound ? 'border-primary shadow-[0_0_10px_var(--primary)]' : 'border-white/5'
                }`}>
                  <span className="text-[10px] uppercase font-bold text-foreground/40">{requiredPlayers}人</span>
                  <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest text-center leading-none">MISSION<br/>{round}</span>
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

              {/* Active Roles Info */}
              <div className="mt-6 pt-4 border-t border-white/10">
                <p className="text-[10px] uppercase font-bold text-foreground/40 mb-2">Active Special Roles</p>
                <div className="flex flex-wrap gap-1">
                  {room.selectedRoles?.filter(r => r !== ROLES.SERVANT && r !== ROLES.MINION).map(role => {
                    const isEvil = [ROLES.ASSASSIN, ROLES.MORGANA, ROLES.MORDRED, ROLES.OBERON].includes(role);
                    return (
                      <span key={role} className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase ${isEvil ? 'bg-red-900/20 text-accent border-accent/30' : 'bg-blue-900/20 text-blue-400 border-blue-500/30'}`}>
                        {role.replace(/ \(.+\)/, '')}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Role Distribution Info */}
              <div className="mt-6 pt-4 border-t border-white/10">
                <p className="text-[10px] uppercase font-bold text-foreground/40 mb-2">Role Distribution</p>
                <div className="flex justify-between text-xs">
                  <span className="text-blue-400 font-bold">Good: {room.players.length === 5 ? 3 : room.players.length === 6 ? 4 : room.players.length === 7 ? 4 : room.players.length === 8 ? 5 : room.players.length === 9 ? 6 : 6}</span>
                  <span className="text-accent font-bold">Evil: {room.players.length === 5 ? 2 : room.players.length === 6 ? 2 : room.players.length === 7 ? 3 : room.players.length === 8 ? 3 : room.players.length === 9 ? 3 : 4}</span>
                </div>
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
                  <div className="mb-8">
                    {isLeader ? (
                       <p className="text-sm text-foreground/60">
                         <strong className="text-primary text-lg">【 定員：{room.teamSize}人 】</strong><br/>
                         今回のミッションに行くメンバーを選んでください。
                       </p>
                    ) : (
                       <p className="text-sm text-foreground/60">
                         リーダー（<strong className="text-primary">{leaderName}</strong>）がメンバーを選んでいます。<br/>
                         今回の定員は <strong className="text-primary">{room.teamSize}人</strong> です。
                       </p>
                    )}
                    <span className="text-accent text-xs font-bold mt-3 inline-block bg-accent/10 px-3 py-1 rounded-full">※{failsRequiredText}</span>
                  </div>

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
                    この {room.teamSize}人のメンバーで遠征に行きますか？
                    <br />
                    <span className="text-accent text-xs font-bold mt-2 inline-block">※{failsRequiredText}</span>
                  </p>

                  {room.votes?.[myId || ""] ? (
                    <div className="text-center p-6 border border-white/10 rounded-xl bg-white/5">
                      <p className="text-sm font-bold opacity-60 mb-2">あなたの投票</p>
                      <div className={`text-2xl font-black uppercase ${room.votes[myId || ""] === 'approve' ? 'text-blue-500' : 'text-accent'} mb-4`}>
                        {room.votes[myId || ""] === 'approve' ? 'APPROVE (賛成)' : 'REJECT (反対)'}
                      </div>
                      <div className="text-xs text-primary font-bold animate-pulse">全員の投票を待っています...</div>
                    </div>
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

              {/* Voting Result Phase */}
              {room.phase === 'voting_result' && (() => {
                const approves = Object.values(room.votes || {}).filter(v => v === 'approve').length;
                const rejects = Object.values(room.votes || {}).filter(v => v === 'reject').length;
                const isApproved = approves > room.players.length / 2;

                return (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                    <h3 className="text-sm font-bold opacity-50 uppercase tracking-widest mb-2">Vote Result</h3>
                    <div className="flex items-center gap-4 mb-8">
                      <div className="text-center">
                        <span className="text-4xl font-black text-blue-500">{approves}</span>
                        <p className="text-xs uppercase font-bold text-blue-500/50">Approve</p>
                      </div>
                      <div className="text-2xl font-black opacity-20">VS</div>
                      <div className="text-center">
                        <span className="text-4xl font-black text-accent">{rejects}</span>
                        <p className="text-xs uppercase font-bold text-accent/50">Reject</p>
                      </div>
                    </div>

                    <div className={`text-4xl font-black uppercase italic tracking-tighter mb-8 ${isApproved ? 'text-blue-500 animate-bounce' : 'text-accent animate-pulse'}`}>
                      {isApproved ? "Approved!" : "Rejected!"}
                    </div>

                    <div className="w-full max-w-sm grid grid-cols-2 gap-2 mb-8 text-sm">
                      {room.players.map(p => {
                        const v = room.votes?.[p.id];
                        return (
                          <div key={p.id} className={`flex items-center justify-between p-2 rounded border ${v === 'approve' ? 'bg-blue-900/20 border-blue-500/30 text-blue-100' : 'bg-red-900/20 border-red-500/30 text-red-100'}`}>
                            <span className="truncate pr-2">{p.name}</span>
                            {v === 'approve' ? <Check className="w-4 h-4 text-blue-500 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-accent flex-shrink-0" />}
                          </div>
                        );
                      })}
                    </div>

                    {isLeader && (
                      <button 
                        className="avalon-btn w-full max-w-sm shadow-[0_0_20px_rgba(212,175,55,0.3)] animate-pulse"
                        onClick={() => proceedFromVoting(room.id)}
                      >
                        次へ進む
                      </button>
                    )}
                    {!isLeader && (
                      <p className="text-xs opacity-50 animate-pulse">リーダーが確認中です...</p>
                    )}
                  </div>
                );
              })()}
              {room.phase === 'mission' && (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                  <h3 className="text-3xl font-black italic text-primary mb-2">THE MISSION</h3>
                  <p className="text-sm text-foreground/60 mb-8">
                    【 {room.teamSize}人遠征 】 メンバー：{room.proposedTeam?.map(pid => room.players.find(p => p.id === pid)?.name).join(", ")}
                    <br />
                    <span className="text-accent text-xs font-bold mt-2 inline-block">※{failsRequiredText}</span>
                  </p>

                  {isSelected ? (
                    room.missionVotes?.[myId || ""] ? (
                      <div className="text-center p-6 border border-white/10 rounded-xl bg-white/5 w-full max-w-sm">
                        <p className="text-sm font-bold opacity-60 mb-2">あなたの選択</p>
                        <div className={`text-2xl font-black uppercase ${room.missionVotes[myId || ""] === 'success' ? 'text-blue-500' : 'text-accent'} mb-4`}>
                           {room.missionVotes[myId || ""] === 'success' ? 'SUCCESS (成功)' : 'FAIL (失敗)'}
                        </div>
                        <div className="text-xs text-primary font-bold animate-pulse">他のメンバーの決断を待っています...</div>
                      </div>
                    ) : (
                      <div className="space-y-4 w-full max-w-sm">
                        <p className="text-xs uppercase font-bold tracking-widest text-accent mb-4">秘密の選択（慎重に！）</p>
                        <button 
                          className="w-full py-6 bg-blue-600/20 border-2 border-blue-600 text-blue-400 font-black text-xl rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)]"
                          onClick={() => submitMissionVote(room.id, myId!, 'success')}
                        >
                          SUCCESS (成功)
                        </button>
                        <button 
                          className="w-full py-6 bg-accent/20 border-2 border-accent text-accent font-black text-xl rounded-2xl hover:bg-accent hover:text-white transition-all shadow-[0_0_20px_rgba(220,38,38,0.2)]"
                          onClick={() => submitMissionVote(room.id, myId!, 'fail')}
                        >
                          FAIL (失敗)
                        </button>
                        <p className="text-[10px] text-foreground/40 mt-4">正義陣営は「成功」しか出せません。邪悪陣営はあえて「成功」を出して信用を稼いでも構いません。</p>
                      </div>
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
              {/* Mission Result Phase */}
              {room.phase === 'mission_result' && (() => {
                const fails = Object.values(room.missionVotes || {}).filter(v => v === 'fail').length;
                const failThreshold = (room.players.length >= 7 && room.currentRound === 4) ? 2 : 1;
                const isSuccess = fails < failThreshold;

                return (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                    <h3 className="text-sm font-bold opacity-50 uppercase tracking-widest mb-2">Mission Result</h3>
                    
                    <div className="flex flex-wrap justify-center gap-4 mb-8">
                      {Object.values(room.missionVotes || {}).sort((a, b) => b.localeCompare(a)).map((v, i) => (
                        <div key={i} className={`w-20 h-28 rounded-xl border flex items-center justify-center shadow-lg transform transition-all ${v === 'success' ? 'bg-blue-600/20 border-blue-500 text-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.3)]' : 'bg-red-600/20 border-red-500 text-red-500 shadow-[0_0_20px_rgba(220,38,38,0.3)]'}`}>
                          {v === 'success' ? <Shield className="w-8 h-8" /> : <Sword className="w-8 h-8" />}
                        </div>
                      ))}
                    </div>

                    <div className="mb-8">
                      <h4 className={`text-5xl font-black uppercase italic tracking-tighter ${isSuccess ? 'text-blue-500 animate-bounce' : 'text-accent animate-pulse'}`}>
                        {isSuccess ? "Success!" : "Failed!"}
                      </h4>
                      <p className="text-foreground/60 text-sm mt-2 font-bold">
                        {fails > 0 ? `失敗カードが ${fails} 枚出ました` : '全て成功カードでした'}
                      </p>
                    </div>

                    {isLeader && (
                      <button 
                        className="avalon-btn w-full max-w-sm shadow-[0_0_20px_rgba(212,175,55,0.3)] animate-pulse"
                        onClick={() => proceedFromMission(room.id)}
                      >
                        次のラウンドへ
                      </button>
                    )}
                    {!isLeader && (
                      <p className="text-xs opacity-50 animate-pulse">リーダーが確認中です...</p>
                    )}
                  </div>
                );
              })()}
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
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-foreground/60 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" /> 戻る
          </button>
          <button 
            onClick={() => setShowRules(true)}
            className="flex items-center gap-2 text-foreground/60 hover:text-primary transition-colors text-xs uppercase font-bold tracking-widest bg-white/5 px-3 py-1.5 rounded-full border border-white/10"
          >
            <BookOpen className="w-4 h-4" /> Rules
          </button>
        </div>
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
                className="avalon-btn w-full mt-6 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(212,175,55,0.3)] animate-pulse"
                onClick={handleStartGame}
                disabled={room.players.length < 5 || starting}
              >
                <Play className="w-4 h-4 fill-current" /> {starting ? "開始中..." : "ゲーム開始"}
              </button>
            )}
            {!isHost && (
              <div className="mt-6 p-3 bg-white/5 border border-white/10 text-center rounded-lg">
                <p className="text-xs text-foreground/60 flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  ホストの開始を待っています...
                </p>
              </div>
            )}
            {room.players.length < 5 && (
              <p className="text-[10px] text-center mt-2 text-accent italic font-bold">
                ※ゲーム開始には最低5人のプレイヤーが必要です (現在 {room.players.length}人)
              </p>
            )}

            {/* ロビー時 役職情報 */}
            {room.players.length >= 5 && (
              <div className="mt-6 pt-4 border-t border-white/10">
                <p className="text-xs uppercase font-bold text-foreground/40 mb-3 text-center tracking-widest">現在の役職内訳</p>
                <div className="grid grid-cols-2 gap-2 text-center text-sm">
                  <div className="p-2 rounded bg-blue-900/20 border border-blue-500/30">
                     <span className="block font-black text-blue-500 text-lg">{room.players.length === 5 ? 3 : room.players.length === 6 ? 4 : room.players.length === 7 ? 4 : room.players.length === 8 ? 5 : room.players.length === 9 ? 6 : 6}</span>
                     <span className="text-[10px] text-blue-400 font-bold uppercase">Good</span>
                  </div>
                  <div className="p-2 rounded bg-red-900/20 border border-red-500/30">
                     <span className="block font-black text-accent text-lg">{room.players.length === 5 ? 2 : room.players.length === 6 ? 2 : room.players.length === 7 ? 3 : room.players.length === 8 ? 3 : room.players.length === 9 ? 3 : 4}</span>
                     <span className="text-[10px] text-accent font-bold uppercase">Evil</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* 役職設定 (ホストのみ変更可能) */}
            <div className="mt-6">
              <button 
                onClick={() => setShowRolesSettings(!showRolesSettings)}
                className="flex items-center justify-between w-full text-xs uppercase font-bold text-foreground/40 hover:text-primary transition-colors py-2 border-t border-b border-white/10"
              >
                <span className="flex items-center gap-2"><Settings className="w-4 h-4" /> 役職設定</span>
                {showRolesSettings ? <X className="w-4 h-4" /> : <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded">Check</span>}
              </button>
              
              {showRolesSettings && (
                <div className="pt-4 space-y-3">
                  {[
                    { role: ROLES.MERLIN, label: "Merlin", type: "good" },
                    { role: ROLES.ASSASSIN, label: "Assassin", type: "evil" },
                    { role: ROLES.PERCIVAL, label: "Percival", type: "good" },
                    { role: ROLES.MORGANA, label: "Morgana", type: "evil" },
                    { role: ROLES.MORDRED, label: "Mordred", type: "evil" },
                    { role: ROLES.OBERON, label: "Oberon", type: "evil" }
                  ].map(({ role, label, type }) => {
                    const isSelected = room.selectedRoles?.includes(role);
                    return (
                      <div key={role} className="flex items-center justify-between">
                        <span className={`text-sm font-bold ${type === 'good' ? 'text-blue-400' : 'text-accent'}`}>{label}</span>
                        <button
                          disabled={!isHost}
                          onClick={() => {
                            const newRoles = isSelected 
                              ? (room.selectedRoles || []).filter(r => r !== role)
                              : [...(room.selectedRoles || []), role];
                            updateSelectedRoles(room.id, newRoles);
                          }}
                          className={`w-12 h-6 rounded-full transition-colors relative flex items-center shadow-inner ${
                            isSelected ? (type === 'good' ? 'bg-blue-600' : 'bg-accent') : 'bg-white/10'
                          } ${!isHost && 'opacity-50 cursor-not-allowed'}`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white absolute transform transition-transform shadow-md ${
                            isSelected ? 'translate-x-[26px]' : 'translate-x-[4px]'
                          }`} />
                        </button>
                      </div>
                    );
                  })}
                  <p className="text-[10px] text-foreground/40 mt-2 leading-relaxed">
                    ※ 人数に満たない枠は自動的に「アーサーの忠実なる家来(正義)」「モードレッドの邪悪な手先(邪悪)」で埋められます。人数を超える役職を選択した場合ランダムに選出されます。
                  </p>
                </div>
              )}
            </div>

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

      {/* Rules Modal */}
      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
    </div>
  );
}
