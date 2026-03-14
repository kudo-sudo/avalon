import { Shield, X } from "lucide-react";

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RulesModal({ isOpen, onClose }: RulesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-background border border-primary/30 rounded-2xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto avalon-card">
        <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-4">
          <h2 className="text-2xl font-black italic text-primary uppercase flex items-center gap-2">
            <Shield className="w-6 h-6" /> How to Play
          </h2>
          <button 
            onClick={onClose}
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
            onClick={onClose}
            className="avalon-btn px-8 py-2"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
