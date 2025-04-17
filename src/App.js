import React, { useEffect, useState } from "react";
import axios from "axios";
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from "react-router-dom";
import { Layout, Menu } from "antd";
import Cookies from "js-cookie";
import { io } from "socket.io-client";
import { useQuery } from "@tanstack/react-query";
import { Vortex } from "react-loader-spinner";
import {
  SyncOutlined,
  OrderedListOutlined,
  BoxPlotOutlined,
  EditOutlined,
  DashboardOutlined,
  SettingOutlined,
  CarOutlined,
  TeamOutlined,
  CheckSquareOutlined,
  StockOutlined,
} from "@ant-design/icons";

import config from "./config.js";
import DeliveryPage from "./components/DeliveryPage";
import UserPerformancePage from "./components/UserPerformancePage.js";
import SyncPage from "./components/SyncPage";
import OrdersPage from "./components/OrdersPage";
import PackingScreen from "./components/Packingscreen";
import PickingPage from "./components/PickingPage.js";
import UpdateProductIds from "./components/UpdateProductIDs.js";
import DashboardPage from "./components/DashboardPage.js";
import CustomHeader from "./components/Header";
import SignIn from "./components/SignIn";
import SignUp from "./components/SignUp";
import SettingsPage from "./components/SettingsPage";
import StockAssessmentPage from "./components/StockAssessmentPage";

const { Content, Footer, Sider } = Layout;
const { SubMenu } = Menu;

function App() {
  const [columnWidths, setColumnWidths] = useState({});
  const [token, setToken] = useState(Cookies.get("token") || null);
  const [userName, setUserName] = useState(Cookies.get("userName") || "");
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState(() => {
    const savedPermissions = Cookies.get("permissions");
    return savedPermissions ? JSON.parse(savedPermissions) : {};
  });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const savedToken = Cookies.get("token");
    const savedUserName = Cookies.get("userName");
    const savedPermissions = Cookies.get("permissions");

    if (savedToken && savedUserName && savedPermissions) {
      setToken(savedToken);
      setUserName(savedUserName);
      setPermissions(JSON.parse(savedPermissions));
      setTimeout(() => {
        setLoading(false);
      }, 3000);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${config.apiBaseUrl}/all-orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.orders;
    } catch (error) {
      console.error("Error fetching orders:", error);
      throw error;
    }
  };

  const { data: orders, refetch } = useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
    refetchInterval: 30000,
    onSuccess: (data) => {
      console.log("Fetched orders:", data);
    },
    onError: (error) => {
      console.error("Error fetching orders:", error);
    },
  });

  useEffect(() => {
    const socket = io(config.websocketUrl);
    socket.on("connect", () => {
      console.log("Connected to WebSocket server");
    });
    socket.on("order-updated", () => {
      console.log("Order updated via WebSocket");
      refetch();
    });
    return () => {
      socket.disconnect();
    };
  }, [refetch]);

  useEffect(() => {
    const eventSource = new EventSource(`${config.apiBaseUrl}/orders/stream`);
    eventSource.onmessage = (event) => {
      console.log("Order updated via SSE:", event.data);
      refetch();
    };
    return () => {
      eventSource.close();
    };
  }, [refetch]);

  const handleSyncComplete = () => {
    refetch();
  };

  const handleResize = (index) => (e, { size }) => {
    setColumnWidths((prev) => ({
      ...prev,
      [columns[index].key]: size.width,
    }));
  };

  const columns = [
    // Define your table columns here
  ];

  const enhancedColumns = columns.map((col, index) => ({
    ...col,
    onHeaderCell: (column) => ({
      width: column.width,
      onResize: handleResize(index),
    }),
  }));

  const handleLogout = () => {
    Cookies.remove("token");
    Cookies.remove("userName");
    Cookies.remove("permissions");
    setToken(null);
    setUserName("");
    setPermissions({});
  };

  return (
    <Router>
      <Layout style={{ minHeight: "100vh" }}>
        {token ? (
          loading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100vh",
              }}
            >
              <Vortex
                visible={true}
                height="80"
                width="80"
                ariaLabel="vortex-loading"
                colors={["red", "green", "blue", "yellow", "orange", "purple"]}
              />
            </div>
          ) : (
            <>
              <Sider collapsible theme="light" style={{ backgroundColor: "#fff" }}>
                <div className="logo" style={{ padding: "16px", textAlign: "center" }}>
                  <img
                    src="https://www.thegoodhealth.co.in/web/image/website/1/logo/www.thegoodhealth.co.in?unique=7145bcf"
                    alt="Logo"
                    style={{ maxWidth: "100%", height: "auto" }}
                  />
                </div>
                <Menu theme="light" defaultSelectedKeys={["1"]} mode="inline">
                  {permissions.dashboardAccess && (
                    <SubMenu key="dashboard" icon={<DashboardOutlined />} title="Dashboard">
                      <Menu.Item key="1">
                        <Link to="/">Overview</Link>
                      </Menu.Item>
                      <Menu.Item key="9" icon={<TeamOutlined />}>
                        <Link to="/user-performance">User Performance</Link>
                      </Menu.Item>
                    </SubMenu>
                  )}
                  {permissions.syncAccess && (
                    <Menu.Item key="2" icon={<SyncOutlined />}>
                      <Link to="/sync">Sync</Link>
                    </Menu.Item>
                  )}
                  {permissions.ordersAccess && (
                    <Menu.Item
                      key="3"
                      onClick={() => setRefreshKey((prevKey) => prevKey + 1)}
                      icon={<OrderedListOutlined />}
                    >
                      <Link to="/orders">Orders</Link>
                    </Menu.Item>
                  )}
                  {permissions.packingAccess && (
                    <Menu.Item key="4" icon={<BoxPlotOutlined />}>
                      <Link to="/packing">Packing</Link>
                    </Menu.Item>
                  )}
                  {permissions.pickingAccess && (
                    <Menu.Item key="10" icon={<CheckSquareOutlined />}>
                      <Link to="/picking">Picking</Link>
                    </Menu.Item>
                  )}
                  {permissions.deliveryAccess && (
                    <Menu.Item key="7" icon={<CarOutlined />}>
                      <Link to="/delivery">Delivery</Link>
                    </Menu.Item>
                  )}
                  {permissions.productsAccess && (
                    <Menu.Item key="5" icon={<EditOutlined />}>
                      <Link to="/update-product-ids">Products</Link>
                    </Menu.Item>
                  )}
                  {permissions.stockAssessmentAccess && (
                    <Menu.Item key="11" icon={<StockOutlined />}>
                      <Link to="/stock-assessment">Stock Assessment</Link>
                    </Menu.Item>
                  )}
                  {permissions.settingsAccess && (
                    <Menu.Item key="6" icon={<SettingOutlined />}>
                      <Link to="/settings">Settings</Link>
                    </Menu.Item>
                  )}
                </Menu>
              </Sider>
              <Layout className="site-layout">
                <CustomHeader
                  userName={userName}
                  setToken={setToken}
                  setUserName={setUserName}
                  handleLogout={handleLogout}
                />
                <Content>
                  <Routes>
                    {permissions.dashboardAccess && (
                      <>
                        <Route path="/" element={<DashboardPage orders={orders} />} />
                        <Route path="/user-performance" element={<UserPerformancePage />} />
                      </>
                    )}
                    {permissions.syncAccess && (
                      <Route path="/sync" element={<SyncPage onSyncComplete={handleSyncComplete} />} />
                    )}
                    {permissions.ordersAccess && (
                      <Route
                        path="/orders"
                        key={refreshKey}
                        element={
                          <OrdersPage
                            orders={orders}
                            columnWidths={columnWidths}
                            handleResize={handleResize}
                            enhancedColumns={enhancedColumns}
                          />
                        }
                      />
                    )}
                    {permissions.pickingAccess && (
                      <Route
                        path="/picking"
                        element={<PickingPage orders={orders} userName={userName} refetch={refetch} />}
                      />
                    )}
                    {permissions.packingAccess && (
                      <Route path="/packing" element={<PackingScreen userName={userName} />} />
                    )}
                    {permissions.deliveryAccess && (
                      <Route
                        path="/delivery"
                        element={<DeliveryPage orders={orders} refetch={refetch} />}
                      />
                    )}
                    {permissions.productsAccess && (
                      <Route path="/update-product-ids" element={<UpdateProductIds />} />
                    )}
                    {permissions.settingsAccess && (
                      <Route path="/settings" element={<SettingsPage token={token} userName={userName} />} />
                    )}
                    {permissions.stockAssessmentAccess && (
                      <Route path="/stock-assessment" element={<StockAssessmentPage />} />
                    )}
                    <Route path="*" element={<Navigate to="/" />} />
                  </Routes>
                </Content>
                <Footer style={{ textAlign: "center" }}>The Good Health ©2025</Footer>
              </Layout>
            </>
          )
        ) : (
          <Routes>
            <Route
              path="/signin"
              element={<SignIn setToken={setToken} setUserName={setUserName} setPermissions={setPermissions} />}
            />
            <Route path="/signup" element={<SignUp />} />
            <Route path="*" element={<Navigate to="/signin" />} />
          </Routes>
        )}
      </Layout>
    </Router>
  );
}

export default App;