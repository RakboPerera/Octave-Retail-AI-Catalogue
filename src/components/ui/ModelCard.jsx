// Shared production-grade model-metadata card. Sits in "How it works" section.
import * as Icons from 'lucide-react';
import './ModelCard.css';

export default function ModelCard({ architecture, trainingWindow, lastRetrain, accuracy, accuracyLabel = 'accuracy', features, driftStatus = 'stable', notes }) {
  return (
    <div className="mc">
      <div className="mc-head">
        <Icons.Cpu size={14} />
        <span className="mc-head-t">Model metadata</span>
        <span className={`mc-drift mc-drift-${driftStatus}`}>
          <Icons.Activity size={10} /> drift · {driftStatus}
        </span>
      </div>
      <div className="mc-grid">
        <div className="mc-row"><span>Architecture</span><b>{architecture}</b></div>
        <div className="mc-row"><span>Training window</span><b>{trainingWindow}</b></div>
        <div className="mc-row"><span>Last retrain</span><b>{lastRetrain}</b></div>
        <div className="mc-row"><span>{accuracyLabel}</span><b className="mc-acc">{accuracy}</b></div>
        {features && <div className="mc-row"><span>Feature count</span><b>{features}</b></div>}
      </div>
      {notes && <div className="mc-notes"><Icons.Info size={11} /> {notes}</div>}
    </div>
  );
}
