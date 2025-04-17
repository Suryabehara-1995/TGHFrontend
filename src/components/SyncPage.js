import React from "react";
import OrderSync from "./OrderSync";
import { AiOutlineSync } from "react-icons/ai";
const SyncPage = ({ onSyncComplete }) => {
  return (
    <div style={{ padding: "20px" }}>
     <h3 style={{
  marginBottom: "20px", 
  background: "#fff", 
  padding: "12px", 
  borderRadius: "10px", 
  display: "flex", 
  alignItems: "center", 
  gap: "10px"
}}>
  <AiOutlineSync /> Sync Shiprocket Orders
</h3>
      <OrderSync onSyncComplete={onSyncComplete} />
    </div>
  );
};

export default SyncPage;