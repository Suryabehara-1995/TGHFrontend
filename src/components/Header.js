import React from 'react';
import { Layout, Menu, Dropdown, Avatar } from 'antd';
import { UserOutlined, SettingOutlined, LogoutOutlined } from '@ant-design/icons';
import Cookies from 'js-cookie';
import { useNavigate } from 'react-router-dom';

const { Header } = Layout;

const CustomHeader = ({ userName, setToken, setUserName, handleLogout }) => {
  const navigate = useNavigate();

  const onLogout = () => {
    handleLogout(); // Call the passed logout function
    navigate('/signin'); // Immediate redirect
  };

  const menu = (
    <Menu>
      <Menu.Item key="1" icon={<UserOutlined />}>
        Profile
      </Menu.Item>
      {/* <Menu.Item key="2" icon={<SettingOutlined />}>
        Settings
      </Menu.Item> */}
      <Menu.Item key="3" icon={<LogoutOutlined />} onClick={onLogout}>
        Logout
      </Menu.Item>
    </Menu>
  );

  return (
    <Header
      className="site-layout-background"
      style={{
        padding: 0,
        backgroundColor: "#fff",
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
      }}
    >
      <div style={{ marginLeft: '16px', fontSize: '20px', fontWeight: 'bold' }}>
        Hi, {userName || 'Guest'}
      </div>
      <Dropdown overlay={menu} placement="bottomRight">
        <Avatar style={{ marginRight: '16px', cursor: 'pointer' }} icon={<UserOutlined />} />
      </Dropdown>
    </Header>
  );
};

export default CustomHeader;