type SimulationHeaderProps = {
  title: string;
  lead: string;
};

export function SimulationHeader({ title, lead }: SimulationHeaderProps) {
  return (
    <div className="panel-header">
      <div>
        <h2>{title}</h2>
        <p className="panel-lead">{lead}</p>
      </div>
    </div>
  );
}
