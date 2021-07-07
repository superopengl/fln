import {
  DeleteOutlined, EditOutlined, PlusOutlined
} from '@ant-design/icons';
import { Button, Drawer, Layout, Modal, Space, Table, Tooltip, Typography } from 'antd';

import { TimeAgo } from 'components/TimeAgo';
import TaskTemplateForm from 'pages/TaskTemplate/TaskTemplateForm';
import React from 'react';
import { withRouter, Link } from 'react-router-dom';
import { deleteTaskTemplate, listTaskTemplate } from 'services/taskTemplateService';
import styled from 'styled-components';

const { Paragraph, Link: TextLink } = Typography;


const LayoutStyled = styled.div`
  margin: 0 auto 0 auto;
  // background-color: #ffffff;
  // height: calc(100vh - 64px);
  height: 100%;
`;



export const TaskTemplatePage = props => {

  const handleEditOne = (id) => {
    props.history.push(`/task_template/${id}`);
  }

  const handleClickTemplate = (e, id) => {
    e.stopPropagation();
    handleEditOne(id);
  }

  const columnDef = [
    {
      title: 'Name',
      dataIndex: 'name',
      render: (text, record) => <TextLink onClick={e => handleClickTemplate(e, record.id)}>{text}</TextLink>
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      render: (text) => <TimeAgo value={text} />
    },
    {
      title: 'Updated At',
      dataIndex: 'lastUpdatedAt',
      render: (text) => <TimeAgo value={text} />
    },
    {
      // title: 'Action',
      align: 'right',
      render: (text, record) => (
        <Space size="small">
          <Tooltip placement="bottom" title="Edit task template">

            <Button type="link" icon={<EditOutlined />} onClick={e => handleEdit(e, record)} />
          </Tooltip>
          <Tooltip placement="bottom" title="Delete task template">
            <Button type="link" danger icon={<DeleteOutlined />} onClick={e => handleDelete(e, record)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const taskTemplateId = props.match.params.id;

  const [list, setList] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [currentId, setCurrentId] = React.useState(taskTemplateId);

  const handleEdit = (e, item) => {
    e.stopPropagation();
    setCurrentId(item.id);
  }

  const handleDelete = async (e, item) => {
    e.stopPropagation();
    const { id, name } = item;
    Modal.confirm({
      title: <>Delete Doc Template <strong>{name}</strong>?</>,
      onOk: async () => {
        setLoading(true);
        await deleteTaskTemplate(id);
        await loadList();
        setLoading(false);
      },
      maskClosable: true,
      okButtonProps: {
        danger: true
      },
      okText: 'Yes, delete it!'
    });
  }

  const loadList = async () => {
    setLoading(true);
    const list = await listTaskTemplate();
    setList(list);
    setLoading(false);
  }

  React.useEffect(() => {
    loadList();
  }, [])

  const handleCreateNew = () => {
    props.history.push('/task_template/new');
  }

  return (
    <LayoutStyled>

      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleCreateNew()}>New Task Template</Button>
        </Space>
        <Table columns={columnDef}
          size="small"
          dataSource={list}
          rowKey="id"
          loading={loading}
          pagination={false}
          // onChange={handleTableChange}
          onRow={(record) => ({
            onDoubleClick: () => handleEditOne(record.id)
          })}
          locale={{
            emptyText: <div style={{margin: '30px auto', fontSize: 14}}>
            <Paragraph type="secondary">
              There is no defined task template. Let's start from creating a new task template.
            </Paragraph>
            <Link to="/task_template/new">Create new task template</Link>
            </div>
          }}
        />
      </Space>
    </LayoutStyled >
  );
};

TaskTemplatePage.propTypes = {};

TaskTemplatePage.defaultProps = {};

export default withRouter(TaskTemplatePage);
