module.exports = app => {
    const { existsOrError, notExistsOrError } = app.api.validation

    const save = (req, res) => {
        const checklist = {
            id: req.body.id,
            description: req.body.description,
            parentId: req.body.parentId,
            userId: req.decoded.id
        }

        if (req.params.id) checklist.id = req.params.id

        try {
            existsOrError(checklist.description, 'Item description was not informed!')
            existsOrError(checklist.userId, 'User was not informed!')

        } catch (msg) {
            return res.status(400).json({ errors: [msg] })
        }

        if (checklist.id) {
            if (checklist.parentId) {
                app.db('checklists').then(checklists => withPath(checklists)).then(tree => {
                    const parentIds = tree.filter(c => c.id === checklist.parentId)[0].parentPathIds
                    if (parentIds.includes(+checklist.id)) {
                        res.status(400).json({ errors: ['Circular reference is not permitted!'] })
                    } else {
                        update(req, res)
                    }
                })
            } else {
                update(req, res)
            }
        } else {
            app.db('checklists')
                .insert(checklist, 'id')
                .then(id => res.json({ ...checklist, id: Number(id[0]) }))
                .catch(err => res.status(500).json({ errors: [err] }))
        }
    }

    const update = (req, res) => {
        const checklist = {
            id: req.body.id,
            description: req.body.description,
            parentId: req.body.parentId,
            userId: req.decoded.id
        }

        if (req.params.id) checklist.id = req.params.id

        app.db('checklists')
            .update(checklist)
            .where({ id: checklist.id })
            .then(id => res.json({ ...checklist, id: Number(checklist.id) }))
            .catch(err => res.status(500).json({ errors: [err] }))
    }

    const remove = async (req, res) => {
        try {
            existsOrError(req.params.id, "Checklist id was not informed!")

            const subChecklists = await app.db('checklists').where({ parentId: req.params.id })

            notExistsOrError(subChecklists, "This checklist has items!")

            const rowsDeleted = await app.db('checklists').where({ id: req.params.id }).del()

            existsOrError(rowsDeleted, "Checklist was not found!")

            res.status(204).send()
        } catch (msg) {
            res.status(400).json({ errors: [msg] })
        }
    }

    const withPath = checklists => {
        const getParent = (checklists, parentId) => {
            const parent = checklists.filter(parent => parent.id === parentId)
            return parent.length ? parent[0] : null
        }

        const checklistsWithPath = checklists.map(checklist => {
            let path = checklist.description
            const parentPathIds = []
            let parentPath = ''
            let parent = getParent(checklists, checklist.parentId)

            while (parent) {
                path = `${parent.description} > ${path}`
                parentPath = parentPath ? `${parent.description} > ${parentPath}` : parent.description
                parentPathIds.push(parent.id)
                parent = getParent(checklists, parent.parentId)
            }

            return { ...checklist, path, parentPath, parentPathIds }
        })

        checklistsWithPath.sort((a, b) => {
            if (a.path < b.path) return -1
            if (a.path > b.path) return 1
            return 0
        })
        return checklistsWithPath
    }

    const get = (req, res) => {
        app.db('checklists')
            .then(checklists => res.json(withPath(checklists)))
            .catch(err => res.status(500).json({ errors: [err] }))
    }

    const getById = (req, res) => {
        app.db('checklists')
            .where({ id: req.params.id })
            .first()
            .then(checklist => res.json(checklist))
            .catch(err => res.status(500).json({ errors: [err] }))
    }

    const toTree = (checklists, tree) => {
        if (!tree) tree = checklists.filter(c => !c.parentId)
        tree = tree.map(parentNode => {
            const isChild = node => node.parentId === parentNode.id
            parentNode.children = toTree(checklists, checklists.filter(isChild))
            return parentNode
        })
        return tree
    }

    const getTree = (req, res) => {
        app.db('checklists')
            .then(checklists => res.json(toTree(checklists)))
            .catch(err => res.status(500).json({ errors: [err] }))
    }

    const clone = (req, res) => {
        const checklist = req.body.checklist

        try {
            existsOrError(checklist, 'Parent path was not informed!')
        } catch (msg) {
            res.status(400).json({ errors: [msg] })
        }

        checklist.description += ' (NEW)'
        saveChecklist(checklist, checklist.parentId, res)

        res.status(204).send()
    }

    const saveChecklist = (item, parentId, res) => {

        item.parentId = parentId

        const children = item.children

        delete item.id
        delete item.children

        app.db('checklists').insert(item, 'id').then(newId => {
            if (children) {
                children.forEach(child => {
                    saveChecklist(child, newId[0], res)
                })
            }
        })
            .catch(err => res.status(500).json({ errors: [err] }))
    }

    const getChecklistsToInsert = (checklist, initialChecklists = []) => {
        return checklist.reduce((checklists, item) => {
            checklists.push({ description: item.description, parentId: item.parentId })
            return getChecklistsToInsert(item.children, checklists)
        }, initialChecklists)
    }

    return { save, remove, get, getById, getTree, clone }
}