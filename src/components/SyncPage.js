import React from "react";
import OrderSync from "./OrderSync";

const SyncPage = ({ onSyncComplete }) => {
  return (
    <div style={{ padding: "20px" }}>
      <h3 style={{ marginBottom: "20px" }}>Orders Sync </h3>
      <OrderSync onSyncComplete={onSyncComplete} />
    </div>
  );
};

export default SyncPage;