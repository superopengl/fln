import {
  PlusOutlined, SearchOutlined
} from '@ant-design/icons';
import { Button, Card, List, Modal, Space, Row, Col, Input, Typography } from 'antd';

import { TimeAgo } from 'components/TimeAgo';
import React from 'react';
import { withRouter, Link } from 'react-router-dom';
import { deleteTaskTemplate, listTaskTemplate } from 'services/taskTemplateService';
import styled from 'styled-components';
import DropdownMenu from 'components/DropdownMenu';
import HighlightingText from 'components/HighlightingText';
import { DocTemplateIcon, TaskTemplateIcon } from '../../components/entityIcon';

const { Text, Paragraph } = Typography;


const LayoutStyled = styled.div`
  margin: 0 auto 0 auto;
  // background-color: #ffffff;
  // height: calc(100vh - 64px);
  height: 100%;

  .ant-list-item {
    padding-left: 0;
    padding-right: 0;
  }
`;



export const TaskTemplateListPage = props => {
  const [list, setList] = React.useState([]);
  const [searchText, setSearchText] = React.useState('');
  const [filteredList, setFilteredList] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const loadList = async () => {
    setLoading(true);
    const list = await listTaskTemplate();
    setList(list);
    setLoading(false);
  }

  React.useEffect(() => {
    loadList();
  }, [])

  React.useEffect(() => {
    setFilteredList(list.filter(x => !searchText || x.name.toLowerCase().includes(searchText.toLowerCase())))
  }, [list, searchText])

  const handleEditOne = (id) => {
    props.history.push(`/task_template/${id}`);
  }

  const handleEdit = (item) => {
    handleEditOne(item.id);
  }

  const handlePreview = (item) => {
  }

  const handleDelete = async (item) => {
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

  const handleCreateNew = () => {
    props.history.push('/task_template/new');
  }

  const span = {
    xs: 24,
    sm: 24,
    md: 24,
    lg: 12,
    xl: 12,
    xxl: 12
  }

  const handleSearchFilter = (text) => {
    setSearchText(text);
  }

  return (
    <LayoutStyled>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Row justify="space-between">
          <Input placeholder="Filter task name"
            onChange={e => handleSearchFilter(e.target.value)}
            allowClear
            prefix={<Text type="secondary"><SearchOutlined /></Text>}
            style={{ width: 240 }} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleCreateNew()}>New Task Template</Button>
        </Row>
        {/* <Table columns={columnDef}
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
            emptyText: <div style={{ margin: '30px auto', fontSize: 14 }}>
              <Paragraph type="secondary">
                There is no defined task template. Let's start from creating a new task template.
              </Paragraph>
              <Link to="/task_template/new">Create new task template</Link>
            </div>
          }}
        /> */}
        <List
          size="small"
          grid={{
            gutter: [24, 24],
            xs: 1,
            sm: 1,
            md: 1,
            lg: 2,
            xl: 3,
            xxl: 4
          }}
          dataSource={filteredList}
          loading={loading}
          locale={{
            emptyText: <div style={{ margin: '30px auto' }}>
              <Paragraph type="secondary">
                There is no task template. Let's start from a one!
              </Paragraph>
              <Link to="/task_template/new">Create new task template</Link>
            </div>
          }}
          renderItem={item => <List.Item>
            <Card
              // size="small"
              bordered={true}
              hoverable
              // type="inner"
              title={<Space>
                <TaskTemplateIcon />
                <HighlightingText search={searchText} value={item.name} />
              </Space>}
              extra={<DropdownMenu
                config={[
                  {
                    menu: 'Edit',
                    onClick: () => handleEdit(item)
                  },
                  {
                    menu: 'Preview',
                    onClick: () => handlePreview(item)
                  },
                  {
                    menu: <Text type="danger">Delete</Text>,
                    onClick: () => handleDelete(item)
                  },
                ].filter(x => !!x)}
              />}
              bodyStyle={{ paddingTop: 16 }}
              onClick={() => handleEdit(item)}
            >
              <Space size="large">
                <TimeAgo key="1" value={item.createdAt} showTime={false} prefix={<Text type="secondary">Created:</Text>} direction="horizontal" />
                <TimeAgo key="2" value={item.lastUpdatedAt} showTime={false} prefix={<Text type="secondary">Updated:</Text>} direction="horizontal" />
              </Space>
              {/* <Paragraph style={{ marginBottom: 0, marginTop: 10 }} ellipsis={{ row: 3 }}>{item.description}</Paragraph> */}
              {item.docNames?.length && <Space size="small" direction="vertical" style={{ marginTop: 20 }}>
                {item.docNames?.map((d, i) => <div key={i}>
                  <DocTemplateIcon />{d}
                </div>)}
              </Space>}
            </Card>
          </List.Item>}
        />
      </Space>
    </LayoutStyled >
  );
};

TaskTemplateListPage.propTypes = {};

TaskTemplateListPage.defaultProps = {};

export default withRouter(TaskTemplateListPage);
