import React from 'react';

export default function InfoCard({ icon, title, text }) {
  return (
    <div className="col-md-6">
      <div className="info-card">
        <div className="icon">{icon}</div>
        <div>
          <h5>{title}</h5>
          <span>{text}</span>
        </div>
      </div>
    </div>
  );
}
