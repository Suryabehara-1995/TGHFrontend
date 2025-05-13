import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Card,
  Col,
  Row,
  Statistic,
  message,
  Breadcrumb,
  Table,
  Button,
  Badge,
  Progress,
  Skeleton,
} from 'antd';
import {
  LineChartOutlined,
  CheckCircleOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
  DashboardOutlined,
  HomeOutlined,
  DownloadOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import config from '../config';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import Cookies from 'js-cookie';
import { useNavigate } from 'react-router-dom';
import { FaHourglassHalf, FaUser } from 'react-icons/fa';
import moment from 'moment';

// Register Chart.js components, including ArcElement for Pie chart
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

function DashboardPage() {
  const [todayStats, setTodayStats] = useState({
    todayOrdersCount: 0,
    todayCompletedCount: 0,
  });
  const [overallStats, setOverallStats] = useState({
    totalOrdersCount: 0,
    overallCompletedCount: 0,
  });
  const [ordersData, setOrdersData] = useState({ labels: [], orders: [], units: [] });
  const [courierShipments, setCourierShipments] = useState([]);
  const [packedPersons, setPackedPersons] = useState([]);
  const [warehouseOutData, setWarehouseOutData] = useState({ yes: 0, no: 0 }); // New state for pie chart
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Define currentTheme
  const currentTheme = {
    cardBackground: '#fff',
    textPrimary: '#000',
    textSecondary: '#666',
    borderColor: '#e8e8e8',
    buttonBackground: '#e0e0e0',
  };

  useEffect(() => {
    const token = Cookies.get('token');
    const userName = Cookies.get('userName');

    if (!token || !userName) {
      navigate('/');
      return;
    }

    const fetchDashboardStats = async () => {
      try {
        // Get date range for the last 30 days
        const today = new Date();
        const fromDate = new Date(today);
        fromDate.setDate(today.getDate() - 29);
        const fromDateStr = fromDate.toISOString().split('T')[0];
        const toDateStr = today.toISOString().split('T')[0];

        // Fetch today's orders
        const todayResponse = await axios.get(`${config.apiBaseUrl}/all-orders`, {
          params: { from: toDateStr, to: toDateStr },
        });

        const todayOrders = Array.isArray(todayResponse.data.orders) ? todayResponse.data.orders : [];
        const filteredTodayOrders = todayOrders.filter((order) => {
          const orderDate = order.order_date ? new Date(order.order_date) : new Date(order.createdAt);
          return orderDate.toISOString().split('T')[0] === toDateStr;
        });

        const todayOrdersCount = filteredTodayOrders.length;
        const todayCompletedCount = filteredTodayOrders.filter(
          (order) => order.packed_status === 'Completed'
        ).length;

        setTodayStats({ todayOrdersCount, todayCompletedCount });

        // Process warehouse out status for today
        const warehouseOutCounts = {
          yes: filteredTodayOrders.filter((order) => order.warehouse_out === 'Yes').length,
          no: filteredTodayOrders.filter((order) => order.warehouse_out !== 'Yes').length,
        };
        setWarehouseOutData(warehouseOutCounts);

        // Process shipments by courier for today
        const courierCounts = {};
        filteredTodayOrders.forEach((order) => {
          if (order.shipments && Array.isArray(order.shipments)) {
            order.shipments.forEach((shipment) => {
              const courier = shipment.courier_name || 'Unknown';
              courierCounts[courier] = (courierCounts[courier] || 0) + 1;
            });
          }
        });

        // Convert to array and sort by count (descending)
        const sortedCourierShipments = Object.entries(courierCounts)
          .map(([courier_name, count]) => ({ courier_name, count }))
          .sort((a, b) => b.count - a.count);

        setCourierShipments(sortedCourierShipments);

        // Process packing users for today
        const packedData = filteredTodayOrders.reduce((acc, order) => {
          if (order.packed_status === 'Completed') {
            const personName =
              order.packed_person_name?.trim() && order.packed_person_name?.trim() !== 'Unknown'
                ? order.packed_person_name.trim()
                : 'Unknown Packer';
            acc[personName] = (acc[personName] || 0) + 1;
          } else {
            acc['Pending Orders'] = (acc['Pending Orders'] || 0) + 1;
          }
          return acc;
        }, {});

        const packedPersonsArray = Object.entries(packedData)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => {
            if (a.name === 'Pending Orders') return -1;
            if (b.name === 'Pending Orders') return 1;
            return a.name.localeCompare(b.name);
          });

        setPackedPersons(packedPersonsArray);

        // Fetch all orders for overall stats and 30-day graph
        const overallResponse = await axios.get(`${config.apiBaseUrl}/all-orders`, {
          params: { from: fromDateStr, to: toDateStr },
        });

        const allOrders = Array.isArray(overallResponse.data.orders) ? overallResponse.data.orders : [];
        const totalOrdersCount = allOrders.length;
        const overallCompletedCount = allOrders.filter(
          (order) => order.packed_status === 'Completed'
        ).length;

        setOverallStats({ totalOrdersCount, overallCompletedCount });

        // Process data for the 30-day graph
        const ordersByDay = {};
        const unitsByDay = {};
        const labels = [];

        // Initialize 30 days of data
        for (let i = 0; i < 30; i++) {
          const date = new Date(fromDate);
          date.setDate(fromDate.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          ordersByDay[dateStr] = 0;
          unitsByDay[dateStr] = 0;
          labels.push(date.getDate().toString().padStart(2, '0'));
        }

        // Aggregate orders and units by day
        allOrders.forEach((order) => {
          const orderDate = order.order_date ? new Date(order.order_date) : new Date(order.createdAt);
          const dateStr = orderDate.toISOString().split('T')[0];
          if (ordersByDay[dateStr] !== undefined) {
            ordersByDay[dateStr] += 1;
            unitsByDay[dateStr] += order.products
              ? order.products.reduce((sum, p) => sum + (p.quantity || 1), 0)
              : 1;
          }
        });

        const orders = Object.values(ordersByDay);
        const units = Object.values(unitsByDay);

        setOrdersData({ labels, orders, units });
        setLoading(false);

        message.info(`Hello, ${Cookies.get('userName')}! Welcome to the dashboard! Here are your statistics.`);
      } catch (err) {
        setError('Failed to load dashboard statistics');
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, [navigate]);

  // Chart.js data and options
  const chartData = {
    labels: ordersData.labels,
    datasets: [
      {
        label: 'Orders',
        data: ordersData.orders,
        backgroundColor: '#ff6f61',
        stack: 'Stack 0',
      },
      {
        label: 'Units',
        data: ordersData.units,
        backgroundColor: '#ffdede',
        stack: 'Stack 0',
      },
    ],
  };

  const chartOptions = {
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Your Daily Orders Data from Last 30 Days',
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Day',
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Count',
        },
      },
    },
    maintainAspectRatio: false,
  };

  // Pie Chart data and options for warehouse out status
  const pieChartData = {
    labels: ['Out: Yes', 'Out: No'],
    datasets: [
      {
        data: [warehouseOutData.yes, warehouseOutData.no],
        backgroundColor: ['#22c55e', '#ef4444'], // Green for Yes, Red for No
        hoverOffset: 10,
      },
    ],
  };

  const pieChartOptions = {
    plugins: {
      legend: { position: 'top', labels: { font: { size: 12 } } },
      title: { display: true, text: "Today's Warehouse Out", font: { size: 14 } },
    },
    maintainAspectRatio: false,
  };

  // Table columns for shipments
  const shipmentColumns = [
    {
      title: '',
      dataIndex: 'icon',
      key: 'icon',
      render: () => (
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#e0e0e0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
          }}
        >
          📦
        </div>
      ),
      width: 50,
    },
    {
      title: 'Courier',
      dataIndex: 'courier_name',
      key: 'courier_name',
    },
    {
      title: 'Type',
      key: 'type',
      render: () => 'Shipments',
    },
    {
      title: 'Total',
      dataIndex: 'count',
      key: 'total',
      render: (count) => `${count}`,
    },
  ];

  return (
    <div style={{ position: 'relative' }}>
      {/* Top Loading Bar */}
      {loading && (
        <Progress
          percent={100}
          showInfo={false}
          status="active"
          strokeColor="#1677ff"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            margin: 0,
            lineHeight: '4px',
          }}
        />
      )}

      {/* Main Content */}
      <div className="container mx-auto p-6" style={{ padding: '30px', backgroundColor: '#f9f9f9' }}>
        {error ? (
          <div className="text-center text-red-500">{error}</div>
        ) : (
          <>
            <Row className="mb-12" style={{ marginBottom: '20px' }}>
              <Col md={12} xs={24} sm={24}>
                <Breadcrumb
                  items={[
                    { href: '', title: <HomeOutlined /> },
                    { href: '', title: <><DashboardOutlined /><span>Dashboard</span></> },
                  ]}
                />
              </Col>
              <Col md={12} xs={24} sm={24}>
                <p style={{ textAlign: 'end' }}>
                  <ApiOutlined /> Welcome back, {Cookies.get('userName')}! Here are your statistics for today
                </p>
              </Col>
            </Row>

            {/* Dashboard Title */}
            <h2
              style={{
                background: 'white',
                padding: '18px',
                borderRadius: '11px',
                borderLeft: '3px solid #194646',
                fontSize: '1.5rem',
                fontWeight: 'bold',
                marginBottom: '1rem',
              }}
            >
              <span style={{ marginLeft: '8px' }}>
                <DashboardOutlined />
              </span>{' '}
              Dashboard
            </h2>

            {/* Metric Cards Row */}
            <Row gutter={[16, 16]} className="mb-6">
              {loading ? (
                // Skeleton for Metric Cards
                [1, 2, 3, 4].map((_, index) => (
                  <Col xs={24} sm={12} md={6} key={index}>
                    <Card style={{ borderRadius: '10px', textAlign: 'center' }}>
                      <Skeleton active paragraph={{ rows: 2 }} title={false} />
                    </Card>
                  </Col>
                ))
              ) : (
                <>
                  <Col xs={24} sm={12} md={6}>
                    <Card style={{ backgroundColor: '#f0f0f0', borderRadius: '10px', textAlign: 'center' }}>
                      <h4 style={{ color: '#000', textAlign: 'center' }}>Today's Orders</h4>
                      <Statistic
                        title=""
                        value={todayStats.todayOrdersCount}
                        prefix={<LineChartOutlined />}
                        valueStyle={{ color: '#000' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card style={{ backgroundColor: '#14b8a6', borderRadius: '10px', textAlign: 'center' }}>
                      <h4 style={{ color: '#fff', textAlign: 'center' }}>Today's Completed Orders</h4>
                      <Statistic
                        title=""
                        value={todayStats.todayCompletedCount}
                        prefix={<CheckCircleOutlined />}
                        valueStyle={{ color: '#fff' }}
                        titleStyle={{ color: '#fff' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card style={{ backgroundColor: '#343d4a', borderRadius: '10px', textAlign: 'center' }}>
                      <h4 style={{ color: '#fff', textAlign: 'center' }}>Total Orders</h4>
                      <Statistic
                        title=""
                        value={overallStats.totalOrdersCount}
                        prefix={<BarChartOutlined />}
                        valueStyle={{ color: '#fff' }}
                        titleStyle={{ color: '#fff' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card style={{ background: '#ff9b7b', borderRadius: '10px', textAlign: 'center' }}>
                      <h4 style={{ color: '#fff', textAlign: 'center' }}>Total Completed Orders</h4>
                      <Statistic
                        value={overallStats.overallCompletedCount}
                        prefix={<ClockCircleOutlined />}
                        valueStyle={{ color: '#fff' }}
                        titleStyle={{ color: '#fff' }}
                      />
                    </Card>
                  </Col>
                </>
              )}
            </Row>

            <Row className="mb-12">
              <Col md={12} xs={24} sm={24}>
                {/* Orders Histogram */}
                <Card style={{ borderRadius: '10px', marginBottom: '20px', width: '100%', marginTop: '20px' }}>
                  {loading ? (
                    <Skeleton active paragraph={{ rows: 10 }} title={false} style={{ height: '400px' }} />
                  ) : (
                    <div style={{ height: '400px' }}>
                      <Bar data={chartData} options={chartOptions} />
                    </div>
                  )}
                </Card>
              </Col>
              <Col md={12} xs={24} sm={24}>
                {/* Shipments by Courier */}
                <Card style={{ borderRadius: '10px', marginBottom: '20px', width: '100%', marginTop: '20px', marginLeft: '5px' }}>
                  {loading ? (
                    <Skeleton active paragraph={{ rows: 4 }} title={true} />
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h4 style={{  fontWeight: 'bold', color: '#666' }}>
                          Today's Shipments by Courier
                        </h4>
                        <Button
                          type="primary"
                          shape="circle"
                          icon={<DownloadOutlined />}
                          style={{ backgroundColor: '#ff6f61', borderColor: '#ff6f61' }}
                          onClick={() => message.info('Restricted access by admin')}
                        />
                      </div>
                      <Table
                        columns={shipmentColumns}
                        dataSource={courierShipments}
                        pagination={{
                          pageSize: 4,
                          showSizeChanger: false,
                          position: ['bottomCenter'],
                        }}
                        rowKey="courier_name"
                        locale={{ emptyText: 'No shipments for today' }}
                        style={{ backgroundColor: '#fff', borderRadius: '8px' }}
                      />
                    </>
                  )}
                </Card>
              </Col>
            </Row>

            <Row className="mb-12">
              <Col md={12} xs={24} sm={24}>
                <Card
                  style={{
                    background: currentTheme.cardBackground,
                    borderRadius: '12px',
                    border: 'none',
                    padding: '10px',
                    marginTop: '20px',
                    color: currentTheme.textPrimary,
                  }}
                >
                  {loading ? (
                    <Skeleton active paragraph={{ rows: 4 }} title={true} />
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '600', color: currentTheme.textPrimary, margin: 0 }}>
                          Today's Packing Users
                        </h3>
                        <Badge
                          color="#22B8CF"
                          text="Today"
                          style={{
                            color: currentTheme.textSecondary,
                            fontSize: '10px',
                            fontWeight: '500',
                            background: currentTheme.buttonBackground,
                            padding: '2px 4px',
                            borderRadius: '4px',
                          }}
                        />
                      </div>
                      <ul style={{ listStyleType: 'none', padding: 0 }}>
                        {packedPersons.length > 0 ? (
                          packedPersons.map((person, index) => (
                            <li
                              key={index}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '8px 0',
                                borderBottom: `1px solid ${currentTheme.borderColor}`,
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <div
                                  style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '8px',
                                    backgroundColor: person.name === 'Pending Orders' || person.name === 'Unknown Packer' ? '#FF6B6B' : '#22B8CF',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: '12px',
                                  }}
                                >
                                  {person.name === 'Pending Orders' || person.name === 'Unknown Packer' ? (
                                    <FaHourglassHalf size={20} color="#FFFFFF" />
                                  ) : (
                                    <FaUser size={20} color="#FFFFFF" />
                                  )}
                                </div>
                                <span style={{ fontSize: '14px', fontWeight: '500', color: currentTheme.textPrimary }}>
                                  {person.name}
                                </span>
                              </div>
                              <span style={{ fontSize: '14px', fontWeight: 'bold', color: currentTheme.textPrimary }}>
                                {person.count}
                              </span>
                            </li>
                          ))
                        ) : (
                          <li style={{ fontSize: '12px', color: currentTheme.textSecondary, textAlign: 'center', padding: '8px 0' }}>
                            No packing data for today
                          </li>
                        )}
                      </ul>
                    </>
                  )}
                </Card>
              </Col>
              <Col md={12} xs={24} sm={24}>
                <Card
                  style={{
                    borderRadius: '10px',
                    marginBottom: '20px',
                    width: '100%',
                    height: '351px',
                    marginLeft: '5px',
                    marginTop: '20px',
                  }}
                >
                  {loading ? (
                    <Skeleton active paragraph={{ rows: 4 }} title={false} style={{ height: '250px' }} />
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',  }}>
                        <h3 style={{  fontWeight: 'bold', color: '#666', margin: 0 }}>
                          Today's Warehouse Out
                        </h3>
                        <Button
                          type="primary"
                          shape="circle"
                          icon={<DownloadOutlined />}
                          size="small"
                          style={{ backgroundColor: '#ff6f61', borderColor: '#ff6f61' }}
                          onClick={() => message.info('Restricted access by admin')}
                        />
                      </div>
                      <div style={{ height: '200px' }}>
                        <Pie data={pieChartData} options={pieChartOptions} />
                      </div>
                    </>
                  )}
                </Card>
              </Col>
            </Row>
          </>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
