const httpStatus = require('http-status');
const { handler, notFound } = require('../middlewares/error');
const { EDFAssert } = require('../utils/Assert');
const _ = require('lodash');
const moment = require('moment');
const EDF = require('../../config/EDF');
const logger = require('../utils/Logger')(module);

/**
 * @description Loads layout by ID
 * @param {Object} req    Requers object
 * @param {Number} id     Layout ID
 * @param {Object} res    Response object
 * @returns {JSON} json   Layout json
 */

exports.load = async (req, layoutName, res) => {
  logger.info(`[load] Loading layout id = ${layoutName}`);

  let layoutSrc = {};
  if (Number.isNaN(Number(layoutName))) {
    try {
      const result = await EDFAssert({
        url: `${EDF.data.coreEndpoint}/searchEntityInstances`,
        method: 'post',
        responseType: 'json',
        headers: { Authorization: req.headers.authorization },
        data: {
          userLogin: (req.user && req.user.username) || 'anonymous',
          searchParams: {
            entityName: EDF.data.layoutModelName,
            query: `[slug] = '${layoutName}'`
          },
          paging: {
            pageNumber: 1,
            pageSize: 99
          }
        }
      });
      layoutSrc = _.get(result, 'data.rows[0]', {});
      logger.debug('[load] Layout getted:');
      logger.debug(layoutSrc);
    } catch (err) {
      logger.error(`[load] Error loading layout Name = ${layoutName}!`);
      logger.error(err.message);
      return handler(err, req, res);
    }
  } else {
    try {
      const result = await EDFAssert({
        url: `${EDF.data.coreEndpoint}/readEntityInstances`,
        method: 'post',
        responseType: 'json',
        headers: { Authorization: req.headers.authorization },
        data: {
          userLogin: (req.user && req.user.username) || 'anonymous',
          entityInstancePks: [{
            entityName: EDF.data.layoutModelName,
            entityInstanceId: Number(layoutName)
          }]
        }
      });
      layoutSrc = _.get(result, 'data.rows[0]', {});
      logger.debug('[load] Layout getted:');
      logger.debug(layoutSrc);
    } catch (err) {
      logger.error(`[load] Error loading layout id = ${layoutName}!`);
      logger.error(err.message);
      return handler(err, req, res);
    }
  }
  const layoutObj = _.get(layoutSrc, 'object');
  if (_.isEmpty(layoutObj)) {
    logger.error(`[load] Error loading layout id = ${layoutName}: not found!`);
    return notFound(req, res);
  }
  let layout;
  try {
    layout = Object.assign({}, layoutObj);
    layout._id = _.get(layoutSrc, 'entityInstancePk.entityInstanceId');
    layout.layoutCategory = layout.layoutCategory ? [parseInt(layout.layoutCategory[0], 10)] || null : null;
    layout.parentId = parseInt(layout.parentId, 10) || null;
    layout.options = JSON.parse(layout.options ? layout.options : '{}');
    if (layout.type === 'layout') {
      layout.widgetIds = (layoutObj.widgetIds && layoutObj.widgetIds.length > 0) ?
        layoutObj.widgetIds.map(widgetPk => _.get(widgetPk, 'entityInstancePk.entityInstanceId')) : [];
      layout.widgets = (layoutObj.widgetIds && layoutObj.widgetIds.length > 0) ?
        await Promise.all(layoutObj.widgetIds.map(async (widgetPk) => {
          const widgetId = _.get(widgetPk, 'entityInstancePk.entityInstanceId');
          if (!widgetId) {
            return {};
          }
          const widgetSrc = await EDFAssert({
            url: `${EDF.data.coreEndpoint}/readEntityInstances`,
            method: 'post',
            responseType: 'json',
            headers: { Authorization: req.headers.authorization },
            data: {
              userLogin: (req.user && req.user.username) || 'anonymous',
              entityInstancePks: [{
                entityName: EDF.data.widgetModelName,
                entityInstanceId: Number(widgetId)
              }]
            }
          });
          const widget = JSON.parse(_.get(widgetSrc, 'data.rows[0].object.data', ''));
          widget._id = Number(widgetId);
          return widget;
        })) : [];
    } else if (layout.type === 'page') {
      layout.blockIds = (layoutObj.blockIds && layoutObj.blockIds.length > 0) ?
        layoutObj.blockIds.map(blockPk => _.get(blockPk, 'entityInstancePk.entityInstanceId')) : [];
      layout.blocks = (layoutObj.blockIds && layoutObj.blockIds.length > 0) ?
        await Promise.all(layoutObj.blockIds.map(async (blockPk) => {
          const blockId = _.get(blockPk, 'entityInstancePk.entityInstanceId');
          if (!blockId) {
            return {};
          }
          const blockSrc = await EDFAssert({
            url: `${EDF.data.coreEndpoint}/readEntityInstances`,
            method: 'post',
            responseType: 'json',
            headers: { Authorization: req.headers.authorization },
            data: {
              userLogin: (req.user && req.user.username) || 'anonymous',
              entityInstancePks: [{
                entityName: EDF.data.blockModelName,
                entityInstanceId: Number(blockId)
              }]
            }
          });
          logger.debug(`[load] Block id = ${blockId} loaded:`);
          logger.debug(_.get(blockSrc, 'data.rows[0].object'));
          const block = {
            data: JSON.parse(_.get(blockSrc, 'data.rows[0].object.data', '{}')),
            options: JSON.parse(_.get(blockSrc, 'data.rows[0].object.options', '{}')),
            title: _.get(blockSrc, 'data.rows[0].object.title', ''),
            type: _.get(blockSrc, 'data.rows[0].object.type', '')
          };
          block._id = Number(blockId);
          return block;
        })) : [];
    }
  } catch (err) {
    logger.error('[load] error in layout!');
    logger.error(err.message);
    return handler(err, req, res);
  }
  if (layout.options && (layout.type === 'layout')) {
    layout.options.colNum = parseInt(layout.options.colNum, 10);
    layout.options.rowHeight = parseInt(layout.options.rowHeight, 10);
  }
  logger.info('[load] Layout successfully loaded');
  logger.info(layout);
  res.status(httpStatus.OK);
  return res.json(layout).end();
};


exports.list = async (req, res) => {
  const { query } = req;
  logger.info('[list] Getting layout list!');
  logger.info(query);

  try {
    let result;
    if (query.ids && query.ids.length > 0) {
      const { ids } = query;
      result = await EDFAssert({
        url: `${EDF.data.coreEndpoint}/readEntityInstances`,
        method: 'post',
        responseType: 'json',
        headers: { Authorization: req.headers.authorization },
        data: {
          userLogin: (req.user && req.user.username) || 'anonymous',
          entityInstancePks: ids.map(id => ({
            entityName: EDF.data.layoutModelName,
            entityInstanceId: Number(id)
          }))
        }
      });
    } else {
      result = await EDFAssert({
        url: `${EDF.data.coreEndpoint}/searchEntityInstances`,
        method: 'post',
        responseType: 'json',
        headers: { Authorization: req.headers.authorization },
        data: {
          userLogin: (req.user && req.user.username) || 'anonymous',
          searchParams: {
            entityName: EDF.data.layoutModelName
          },
          paging: {
            pageNumber: 1,
            pageSize: 99999
          }
        }
      });
    }
    const rows = _.get(result, 'data.rows');
    logger.debug('[list] Layout list getted!');
    logger.debug(rows);
    const layoutsList = rows && rows.map((item) => {
      logger.debug('[list] Processing Layout:');
      logger.debug(item.object);
      if (_.isEmpty(item.object)) return null;
      const layout = Object.assign({}, item.object);
      layout.options = JSON.parse(layout.options);
      layout.layoutCategory = layout.layoutCategory ? [parseInt(layout.layoutCategory[0], 10)] || null : null;
      layout.parentId = parseInt(layout.parentId, 10) || null;
      layout._id = _.get(item, 'entityInstancePk.entityInstanceId');
      return layout;
    });
    logger.info('[list] Layout list successfully loaded!');
    logger.info(layoutsList);
    res.status(httpStatus.OK);
    return res.json(_.compact(layoutsList)).end();
  } catch (err) {
    logger.error('[list] Error getting layout list!');
    logger.error(err.message);
    return handler(err, req, res);
  }
};

exports.createLayout = async (req, res) => {
  const { body } = req;
  logger.info('[createLayout] Creating layout!');
  logger.info(body.data);

  const now = moment().format();
  const user = (req.user && req.user.username) || 'anonymous';
  const layout = body.data;

  if (layout.widgetIds && layout.widgetIds.length > 0) {
    layout.widgets = await Promise.all(layout.widgetIds.map(async (widgetId) => {
      if (!widgetId) {
        return {};
      }
      const widgetSrc = await EDFAssert({
        url: `${EDF.data.coreEndpoint}/readEntityInstances`,
        method: 'post',
        responseType: 'json',
        headers: { Authorization: req.headers.authorization },
        data: {
          userLogin: (req.user && req.user.username) || 'anonymous',
          entityInstancePks: [{
            entityName: EDF.data.widgetModelName,
            entityInstanceId: typeof widgetId === 'object' ? _.get(widgetId, 'entityInstancePk.entityInstanceId') : Number(widgetId)
          }]
        }
      });
      const widget = JSON.parse(_.get(widgetSrc, 'data.rows[0].object.data', ''));
      widget._id = Number(widgetId);
      return widget;
    }));
    logger.info('[createLayout] All widgets readed!');
    logger.info(layout.widgets);
  }

  const newLayout = {
    dateCreated: now,
    whoCreated: user,
    layoutCategory: layout.layoutCategory ? [String(layout.layoutCategory)] : null,
    widgetIds: layout.widgets ? await Promise.all(layout.widgets.map(async (widget) => {
      const data = JSON.stringify(widget);
      try {
        const newWidget = await EDFAssert({
          url: `${EDF.data.coreEndpoint}/createEntityInstances`,
          method: 'post',
          responseType: 'json',
          headers: { Authorization: req.headers.authorization },
          data: {
            userLogin: (req.user && req.user.username) || 'anonymous',
            entityInstances: [{
              entityName: EDF.data.widgetModelName,
              object: { data }
            }]
          }
        });
        const id = _.get(newWidget, 'data.rows[0].entityInstancePk.entityInstanceId');
        return String(id);
      } catch (err) {
        logger.error('[createLayout] Error creating new widget!');
        logger.error(err.message);
        return null;
      }
    })) : [],
    id: null,
    parentId: layout.parentId ? String(layout.parentId) : null,
    type: layout.type || '',
    slug: layout.slug,
    title: layout.title || '',
    status: 'draft',
    options: JSON.stringify(layout.options)
  };
  logger.debug('[createLayout] Layout to create:');
  logger.debug(newLayout);
  try {
    const createdLayoutSrc = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/createEntityInstances`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        userLogin: (req.user && req.user.username) || 'anonymous',
        entityInstances: [{
          entityName: EDF.data.layoutModelName,
          object: newLayout
        }]
      }
    });

    const id = _.get(createdLayoutSrc, 'data.rows[0].entityInstancePk.entityInstanceId');
    const createdLayout = _.get(createdLayoutSrc, 'data.rows[0].object');
    createdLayout._id = Number(id);
    createdLayout.widgets = layout.widgets || [];
    createdLayout.options = JSON.parse(createdLayout.options);
    logger.debug('[createLayout] Response Layout created!');
    logger.debug(createdLayout);
    res.status(httpStatus.CREATED);
    return res.json(createdLayout).end();
  } catch (err) {
    logger.error('[createLayout] Error creating new Layout!');
    logger.error(err.message);
    if (newLayout.widgetIds && newLayout.widgetIds.length > 0) {
      try {
        await EDFAssert({
          url: `${EDF.data.coreEndpoint}/deleteEntityInstances`,
          method: 'post',
          responseType: 'json',
          headers: { Authorization: req.headers.authorization },
          data: {
            userLogin: (req.user && req.user.username) || 'anonymous',
            entityInstancePks: newLayout.layoutIds.map(widgetId => ({
              entityName: EDF.data.widgetModelName,
              entityInstanceId: Number(widgetId)
            }))
          }
        });
        logger.info('[createLayout] All widgets successfully deleted');
      } catch (error) {
        logger.error('[createLayout] Error deleting widgets!');
        logger.error(error.message);
      }
    }
    return handler(err, req, res);
  }
};

exports.createPage = async (req, res) => {
  const { body } = req;
  logger.info('[createPage] Creating page!');
  logger.info(body.data);

  const now = moment().format();
  const user = (req.user && req.user.username) || 'anonymous';
  const layout = body.data;

  if (layout.blockIds && layout.blockIds.length > 0) {
    layout.blocks = await Promise.all(layout.blockIds.map(async (blockId) => {
      if (!blockId) {
        return {};
      }
      const blockSrc = await EDFAssert({
        url: `${EDF.data.coreEndpoint}/readEntityInstances`,
        method: 'post',
        responseType: 'json',
        headers: { Authorization: req.headers.authorization },
        data: {
          userLogin: (req.user && req.user.username) || 'anonymous',
          entityInstancePks: [{
            entityName: EDF.data.blockModelName,
            entityInstanceId: Number(blockId)
          }]
        }
      });
      logger.debug(`[createPage] Block id = ${blockId} loaded:`);
      logger.debug(_.get(blockSrc, 'data.rows[0].object'));
      const block = {
        data: JSON.parse(_.get(blockSrc, 'data.rows[0].object.data', '{}')),
        options: JSON.parse(_.get(blockSrc, 'data.rows[0].object.options', '{}')),
        title: _.get(blockSrc, 'data.rows[0].object.title', ''),
        type: _.get(blockSrc, 'data.rows[0].object.type', '')
      };
      block._id = Number(blockId);
      return block;
    }));
  }

  const newLayout = {
    dateCreated: now,
    whoCreated: user,
    layoutCategory: layout.layoutCategory ? [String(layout.layoutCategory)] : null,
    blockIds: layout.blocks ? await Promise.all(layout.blocks.map(async (block) => {
      const newBlock = {
        options: block.options && JSON.stringify(block.options),
        data: block.data && JSON.stringify(block.data),
        title: block.title,
        type: block.type
      };
      logger.debug('[createPage] Trying to create block:');
      logger.debug(newBlock);
      try {
        const newBlockSrc = await EDFAssert({
          url: `${EDF.data.coreEndpoint}/createEntityInstances`,
          method: 'post',
          responseType: 'json',
          headers: { Authorization: req.headers.authorization },
          data: {
            userLogin: (req.user && req.user.username) || 'anonymous',
            entityInstances: [{
              entityName: EDF.data.widgetModelName,
              object: newBlock
            }]
          }
        });
        const id = _.get(newBlockSrc, 'data.rows[0].entityInstancePk.entityInstanceId');
        return String(id);
      } catch (err) {
        logger.error('[create] Error creating new block!');
        logger.error(err.message);
        return null;
      }
    })) : [],
    id: null,
    parentId: layout.parentId ? String(layout.parentId) : null,
    type: layout.type || '',
    slug: layout.slug,
    title: layout.title || '',
    status: 'draft',
    options: JSON.stringify(layout.options)
  };
  logger.debug('[create] Layout to create:');
  logger.debug(newLayout);
  try {
    const createdLayoutSrc = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/createEntityInstances`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        userLogin: (req.user && req.user.username) || 'anonymous',
        entityInstances: [{
          entityName: EDF.data.layoutModelName,
          object: newLayout
        }]
      }
    });

    const id = _.get(createdLayoutSrc, 'data.rows[0].entityInstancePk.entityInstanceId');
    const createdLayout = _.get(createdLayoutSrc, 'data.rows[0].object');
    createdLayout._id = Number(id);
    createdLayout.blocks = layout.blocks || [];
    createdLayout.options = JSON.parse(createdLayout.options);
    logger.debug('[create] New Layout created!');
    logger.debug(createdLayout);
    res.status(httpStatus.CREATED);
    return res.json(createdLayout).end();
  } catch (err) {
    logger.error('[create] Error creating new Layout!');
    logger.error(err.message);
    if (newLayout.blockIds && newLayout.blockIds.length > 0) {
      try {
        await EDFAssert({
          url: `${EDF.data.coreEndpoint}/deleteEntityInstances`,
          method: 'post',
          responseType: 'json',
          headers: { Authorization: req.headers.authorization },
          data: {
            userLogin: (req.user && req.user.username) || 'anonymous',
            entityInstancePks: newLayout.layoutIds.map(blockId => ({
              entityName: EDF.data.widgetModelName,
              entityInstanceId: blockId
            }))
          }
        });
        logger.info('[createPage] All blocks successfully deleted');
      } catch (error) {
        logger.error('[createPage] Error deleting blocks!');
        logger.error(error.message);
      }
    }
    return handler(err, req, res);
  }
};

exports.update = async (req, id, res) => {
  logger.info(`[update] Updating layout id = ${id}`);
  logger.info(req.body && req.body.data);

  const now = moment().format();
  const user = (req.user && req.user.username) || 'anonymous';
  const layout = req.body && req.body.data;
  const layoutId = id;
  let newLayout;
  try {
    if (layout.type === 'layout') {
      newLayout = {
        dateCreated: Number.isNaN(moment(layout.dateCreated)) ?
          moment(layout.dateCreated, 'DD-MM-YYYY HH:mm') : layout.dateCreated,
        dateModified: now,
        layoutCategory: layout.layoutCategory ? [String(layout.layoutCategory)] : null,
        whoCreated: layout.whoCreated || user,
        whoModified: user,
        widgetIds: await Promise.all(layout.widgets.map(async (widget) => {
          const data = JSON.stringify(widget);
          if (widget._id) {
            try {
              logger.debug(`[update] Trying to update widget id = ${widget._id}`);
              await EDFAssert({
                url: `${EDF.data.coreEndpoint}/updateEntityInstances`,
                method: 'post',
                responseType: 'json',
                headers: { Authorization: req.headers.authorization },
                data: {
                  userLogin: (req.user && req.user.username) || 'anonymous',
                  entityInstances: [{
                    entityInstancePk: {
                      entityName: EDF.data.widgetModelName,
                      entityInstanceId: Number(widget._id)
                    },
                    object: { data }
                  }]
                }
              });
              return widget._id;
            } catch (err) {
              logger.error(`[update] Error updaring widget ${widget._id}!`);
              logger.error(err.message);
              return null;
            }
          } else {
            try {
              logger.debug('[update] Trying to create widget!');
              const newWidget = await EDFAssert({
                url: `${EDF.data.coreEndpoint}/createEntityInstances`,
                method: 'post',
                responseType: 'json',
                headers: { Authorization: req.headers.authorization },
                data: {
                  userLogin: (req.user && req.user.username) || 'anonymous',
                  entityInstances: [{
                    entityName: EDF.data.widgetModelName,
                    object: { data }
                  }]
                }
              });
              logger.debug('[update] Widget created!');
              logger.debug(_.get(newWidget, 'data.rows[0]'));
              const _id = _.get(newWidget, 'data.rows[0].entityInstancePk.entityInstanceId');
              widget._id = _id;
              return _id;
            } catch (err) {
              logger.error('[update] Error creating new widget!');
              logger.error(err.message);
              return null;
            }
          }
        })),
        parentId: layout.parentId ? String(layout.parentId) : null,
        type: layout.type,
        slug: layout.slug,
        title: layout.title || '',
        status: layout.status || 'draft',
        options: JSON.stringify(layout.options)
      };
    } else if (layout.type === 'page') {
      newLayout = {
        dateCreated: Number.isNaN(moment(layout.dateCreated)) ?
          moment(layout.dateCreated, 'DD-MM-YYYY HH:mm') : layout.dateCreated,
        dateModified: now,
        whoCreated: layout.whoCreated || user,
        whoModified: user,
        layoutCategory: layout.layoutCategory ? [String(layout.layoutCategory)] : null,
        blockIds: await Promise.all(layout.blocks.map(async (block) => {
          const newBlock = {
            options: block.options && JSON.stringify(block.options),
            data: block.data && JSON.stringify(block.data),
            title: block.title,
            type: block.type
          };
          if (block._id) {
            try {
              logger.debug(`[update] Trying to update block id = ${block._id}`);
              await EDFAssert({
                url: `${EDF.data.coreEndpoint}/updateEntityInstances`,
                method: 'post',
                responseType: 'json',
                headers: { Authorization: req.headers.authorization },
                data: {
                  userLogin: (req.user && req.user.username) || 'anonymous',
                  entityInstances: [{
                    entityInstancePk: {
                      entityName: EDF.data.blockModelName,
                      entityInstanceId: Number(block._id)
                    },
                    object: newBlock
                  }]
                }
              });
              return block._id;
            } catch (err) {
              logger.error(`[update] Error updating block ${block._id}!`);
              logger.error(err.message);
              return null;
            }
          } else {
            try {
              logger.debug('[update] Trying to create block');
              logger.debug(newBlock);
              const newBlockSrc = await EDFAssert({
                url: `${EDF.data.coreEndpoint}/createEntityInstances`,
                method: 'post',
                responseType: 'json',
                headers: { Authorization: req.headers.authorization },
                data: {
                  userLogin: (req.user && req.user.username) || 'anonymous',
                  entityInstances: [{
                    entityName: EDF.data.blockModelName,
                    object: newBlock
                  }]
                }
              });
              logger.debug('[update] Block created!');
              logger.debug(_.get(newBlockSrc, 'data.rows[0]'));
              const _id = _.get(newBlockSrc, 'data.rows[0].entityInstancePk.entityInstanceId');
              block._id = _id;
              return _id;
            } catch (err) {
              logger.error('[update] Error creating new block!');
              logger.error(err.message);
              return null;
            }
          }
        })),
        parentId: layout.parentId ? String(layout.parentId) : null,
        type: layout.type,
        slug: layout.slug,
        title: layout.title || '',
        status: layout.status || 'draft',
        options: JSON.stringify(layout.options)
      };
    }
  } catch (err) {
    logger.error('[update] Error creating newLayout!');
    logger.error(err.message);
    return handler(err, req, res);
  }
  try {
    logger.debug(`[update] Trying to update Layout id = ${layoutId}`);
    logger.debug(newLayout);
    const NewLayoutSrc = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/updateEntityInstances`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        userLogin: (req.user && req.user.username) || 'anonymous',
        entityInstances: [{
          entityInstancePk: {
            entityName: EDF.data.layoutModelName,
            entityInstanceId: Number(layoutId)
          },
          object: newLayout
        }]
      }
    });
    logger.debug('[update] Layout successfully updated!');
    logger.debug(_.get(NewLayoutSrc, 'data.rows[0].object'));
    if (layout.widgetIds) {
      logger.debug('[update] Deleting unused widgets!!!');
      await Promise.all(layout.widgetIds.map(async (widgetId) => {
        if (newLayout.widgetIds.indexOf(widgetId) === -1) {
          logger.debug(`[update] Unused widget id = ${widgetId}! Deleting...`);
          try {
            await EDFAssert({
              url: `${EDF.data.coreEndpoint}/deleteEntityInstances`,
              method: 'post',
              responseType: 'json',
              headers: { Authorization: req.headers.authorization },
              data: {
                userLogin: (req.user && req.user.username) || 'anonymous',
                entityInstancePks: [{
                  entityName: EDF.data.widgetModelName,
                  entityInstanceId: widgetId
                }]
              }
            });
            logger.info(`[update] widget ID=${widgetId} successfully deleted`);
          } catch (err) {
            logger.error(`[update] Error deleting widget id = ${widgetId}!`);
            logger.error(err.message);
          }
        }
      }));
    }
    if (layout.blockIds) {
      logger.debug('[update] Deleting unused blocks!!!');
      await Promise.all(layout.blockIds.map(async (blockId) => {
        if (newLayout.blockIds.indexOf(blockId) === -1) {
          logger.debug(`[update] Unused block id = ${blockId}! Deleting...`);
          try {
            await EDFAssert({
              url: `${EDF.data.coreEndpoint}/deleteEntityInstances`,
              method: 'post',
              responseType: 'json',
              headers: { Authorization: req.headers.authorization },
              data: {
                userLogin: (req.user && req.user.username) || 'anonymous',
                // sessionId: EDF.data.sessionID,
                entityInstancePks: [{
                  entityName: EDF.data.blockModelName,
                  entityInstanceId: blockId
                }]
              }
            });
            logger.info(`[update] block ID=${blockId} successfully deleted`);
          } catch (err) {
            logger.error(`[update] Error deleting block id = ${blockId}!`);
            logger.error(err.message);
          }
        }
      }));
    }
    const _id = _.get(NewLayoutSrc, 'data.rows[0].entityInstancePk.entityInstanceId');
    const updatedLayout = _.get(NewLayoutSrc, 'data.rows[0].object');
    updatedLayout.widgets = layout.widgets;
    updatedLayout.blocks = layout.blocks;
    updatedLayout._id = _id;
    logger.info(`[update] Layout ID=${layoutId} successfully updated`);
    logger.info(updatedLayout);
    return res.json(updatedLayout).end();
  } catch (err) {
    logger.error(`[update] Error updating Layout id = ${layoutId}!`);
    logger.error(err.message);
    return handler(err, req, res);
  }
};

exports.delete = async (req, id, res) => {
  logger.info(`[delete] Deleting Layout id = "${id}"`);
  const layoutId = id;

  // Getting layout and deliting its Widgets or Blocks!!
  try {
    const result = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/readEntityInstances`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        userLogin: (req.user && req.user.username) || 'anonymous',
        entityInstancePks: [{
          entityName: EDF.data.layoutModelName,
          entityInstanceId: Number(id)
        }]
      }
    });

    const layout = _.get(result, 'data.rows[0].object', {});
    logger.info('[delete] Layout data is:');
    logger.info(layout);
    if (layout.widgetIds && layout.widgetIds.length > 0) {
      try {
        await EDFAssert({
          url: `${EDF.data.coreEndpoint}/deleteEntityInstances`,
          method: 'post',
          responseType: 'json',
          headers: { Authorization: req.headers.authorization },
          data: {
            userLogin: (req.user && req.user.username) || 'anonymous',
            entityInstancePks: _.compact(layout.widgetIds).map((widgetPk) => {
              const widgetId = _.get(widgetPk, 'entityInstancePk.entityInstanceId');
              return {
                entityName: EDF.data.widgetModelName,
                entityInstanceId: Number(widgetId)
              };
            })
          }
        });
        logger.info('[delete] All widgets successfully deleted');
      } catch (err) {
        logger.error('[delete] error delete widgets!');
        logger.error(err.message);
        return handler(err, req, res);
      }
    }
    if (layout.blockIds && layout.blockIds.length > 0) {
      try {
        await EDFAssert({
          url: `${EDF.data.coreEndpoint}/deleteEntityInstances`,
          method: 'post',
          responseType: 'json',
          headers: { Authorization: req.headers.authorization },
          data: {
            userLogin: (req.user && req.user.username) || 'anonymous',
            entityInstancePks: _.compact(layout.blockIds).map((blockPk) => {
              const blockId = _.get(blockPk, 'entityInstancePk.entityInstanceId');
              return {
                entityName: EDF.data.blockModelName,
                entityInstanceId: Number(blockId)
              };
            })
          }
        });
        logger.info('[delete] All blocks successfully deleted');
      } catch (err) {
        logger.error('[delete] error delete blocks!');
        logger.error(err.message);
        return handler(err, req, res);
      }
    }
  } catch (err) {
    logger.error('[delete] Error loading Layout!');
    logger.error(err.message);
    return handler(err, req, res);
  }
  try {
    await EDFAssert({
      url: `${EDF.data.coreEndpoint}/deleteEntityInstances`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        userLogin: (req.user && req.user.username) || 'anonymous',
        entityInstancePks: [{
          entityName: EDF.data.layoutModelName,
          entityInstanceId: Number(layoutId)
        }]
      }
    });
    logger.info(`[delete] Layout ID=${layoutId} successfully deleted`);
    return res.status(httpStatus.NO_CONTENT).end();
  } catch (err) {
    logger.error(`[delete] Error deleting layout id = ${layoutId}!`);
    logger.error(err.message);
    return handler(err, req, res);
  }
};
