module.exports = app => {
    const { existsOrError } = app.api.validation

    const save = (req, res) => {
        const evaluation = {
            id: req.body.id,
            projectId: req.body.projectId,
            sprint: req.body.sprint,
            checklistId: req.body.checklistId,
            userId: req.body.userId,
            date: req.body.date,
            checklist: req.body.checklist
        }

        evaluation.date = new Date()

        if (req.params.id) evaluation.id = req.params.id

        try {
            existsOrError(evaluation.projectId, 'Project was not informed!')
            existsOrError(evaluation.sprint, 'Sprint was not informed!')
            existsOrError(evaluation.checklistId, 'Checklist was not informed!')
            existsOrError(evaluation.userId, 'User was not informed!')
        } catch (msg) {
            return res.status(400).json({ errors: [msg] })
        }

        const checklist = evaluation.checklist
        delete evaluation.checklist

        if(checklist && checklist.length > 0) {
            evaluation.score = getScore(checklist)
        }   

        if (evaluation.id) {        
            app.db('evaluations')
                .update(evaluation)
                .where({ id: evaluation.id })
                .then(_ => {
                    if(checklist && checklist.length > 0) {
                        updateAnswers(evaluation.id, checklist, res)
                    } else {
                        res.status(204).send()
                    }
                })                                                                                                    
                .catch(err => res.status(500).json({ errors: [err] }))

              
        } else {

            try {
                existsOrError(checklist, 'You need to answer the checklist!')
            } catch (msg) {
                return res.status(400).json({ errors: [msg] })
            }

            const evaluationId = app.db('evaluations')
                .insert(evaluation)
                .returning('id')
                .then(evaluationId => insertAnswers(evaluationId[0], checklist, res))
                .catch(err => res.status(500).json({ errors: [err] }))
        }
    }

    const updateAnswers = (evaluationId, checklist, res) => {
        app.db('answers').where({ evaluationId: evaluationId }).del().then(
            rowsDeleted => {
                try {
                    existsOrError(rowsDeleted, "Answers were not found!")
                } catch (msg) {
                    return res.status(400).json({ errors: [msg] })
                }        
                
                insertAnswers(evaluationId, checklist, res)            
            }    
        )           
    }    

    const insertAnswers = (evaluationId, checklist, res) => {
        const rows = getChecklistAnswersToInsert(evaluationId, checklist)
        const chunkSize = rows.lenght
        app.db.batchInsert('answers', rows, chunkSize)
            .then(_ => res.status(204).send())
            .catch(err => res.status(500).json({ errors: [err] }))
    }

    const remove = async (req, res) => {
        try {
            existsOrError(req.params.id, "Evaluation id was not informed!")

            const rowsDeleted = await app.db('evaluations').where({ id: req.params.id }).del()

            existsOrError(rowsDeleted, "Evaluation was not found!")

            res.status(204).send()
        } catch (msg) {
            res.status(400).send(msg)
        }
    }

    const get = (req, res) => {
        app.db.select(
            {
                id: 'evaluations.id',
                projectId: 'evaluations.projectId',
                sprint: 'evaluations.sprint',
                checklistId: 'evaluations.checklistId',
                score: 'evaluations.score',
                userId: 'evaluations.userId',
                date: 'evaluations.date',
                projectName: 'projects.name',
                checklistDescription: 'checklists.description'
            }
        ).from('evaluations')
            .leftJoin('projects', 'evaluations.projectId', 'projects.id')
            .leftJoin('checklists', 'evaluations.checklistId', 'checklists.id')
            .then(evaluations => res.json(evaluations))
            .catch(err => res.status(500).json({ errors: [err] }))
    }

    const getById = (req, res) => {
        app.db('evaluations')
            .where({ id: req.params.id })
            .first()
            .then(evaluation => res.json(evaluation))
            .catch(err => res.status(500).json({ errors: [err] }))
    }

    const getAnswers = (req, res) => {
        app.db('answers')
            .where({ evaluationId: req.params.id })
            .then(answers => res.json(answers))
            .catch(err => res.status(500).json({ errors: [err] }))
    }

    const getChecklistAnswersToInsert = (evaluationId, checklist, initialAnswers = []) => {
        return checklist.reduce((answers, item) => {
            answers.push({evaluationId, checklistId: item.id, value: +item.value})
            return getChecklistAnswersToInsert(evaluationId, item.children, answers)
        }, initialAnswers)
    }

    const getScore = (checklist) => checklist[0].value

    return { save, remove, get, getById, getAnswers }
}